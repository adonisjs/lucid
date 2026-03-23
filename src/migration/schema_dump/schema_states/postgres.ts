/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { BaseSchemaState } from '../base_schema_state.js'
import { type PostgreConfig, type QueryClientContract } from '../../../types/database.js'

/**
 * PostgreSQL schema dumps are delegated to `pg_dump`.
 */
export class PgSchemaState extends BaseSchemaState {
  constructor(
    client: QueryClientContract,
    connectionConfig: PostgreConfig,
    schemaTableName: string,
    schemaVersionsTableName: string
  ) {
    super(client, connectionConfig, schemaTableName, schemaVersionsTableName)
  }

  /**
   * Convert a Lucid PostgreSQL connection config into the shape expected by
   * the PostgreSQL CLI tools.
   */
  #normalizeCliConnection() {
    const connection = this.connectionConfig.connection as PostgreConfig['connection']

    if (!connection) {
      throw new Error('Incomplete PostgreSQL connection config. Cannot create schema dump')
    }

    if (typeof connection === 'string') return this.#parseConnectionString(connection)
    if (connection.connectionString) return this.#parseConnectionString(connection.connectionString)

    if (!connection.database || !connection.user) {
      throw new Error('Incomplete PostgreSQL connection config. Cannot create schema dump')
    }

    return {
      host: connection.host,
      port: String(connection.port),
      user: connection.user,
      password: connection.password ?? '',
      database: connection.database,
    }
  }

  /**
   * Parse a PostgreSQL connection string into the normalized structure used
   * by the CLI integration helpers.
   */
  #parseConnectionString(connectionString: string) {
    const url = new URL(connectionString)

    return {
      host: url.hostname,
      port: url.port,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
    }
  }

  /**
   * Dump the structural schema using `pg_dump`.
   */
  protected async dumpSchema(path: string) {
    const connection = this.#normalizeCliConnection()
    const args = [
      '--schema-only',
      /**
       * Fresh database wipes (db:wipe) do not necessarily remove custom schemas, enums,
       * sequences, or other non-table objects. Emitting `DROP ... IF EXISTS`
       * before the structural SQL keeps the dump replayable on that state.
       */
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
      `--host=${connection.host}`,
      `--port=${connection.port}`,
      `--username=${connection.user}`,
      `--dbname=${connection.database}`,
    ]

    await this.spawnToFile('pg_dump', args, path, {
      env: {
        ...process.env,
        /**
         * `pg_dump` reads passwords from `PGPASSWORD`. This keeps credentials
         * out of process arguments.
         */
        PGPASSWORD: connection.password,
      },
    })

    await this.normalizeDump(path)
  }

  /**
   * Dump Lucid's migration bookkeeping tables with `pg_dump --data-only`.
   *
   * PostgreSQL cannot rely on the generic metadata dumper from the base class.
   * That path appends plain `INSERT` statements, but it does not update the
   * `serial` sequence backing `adonis_schema.id`. Dumping these tables through
   * `pg_dump` keeps the restore native to Postgres and preserves the sequence
   * state needed by future migration inserts.
   */
  protected async dumpMigrationMetadata() {
    const connection = this.#normalizeCliConnection()
    const statements: string[] = []

    for (let tableName of [this.schemaTableName, this.schemaVersionsTableName]) {
      if (!(await this.client.schema.hasTable(tableName))) {
        continue
      }

      const output = await this.spawnCommand(
        'pg_dump',
        [
          '--data-only',
          '--no-owner',
          '--no-acl',
          /**
           * Lucid keeps its migration bookkeeping tables in PostgreSQL's
           * default `public` schema. Qualifying the table name keeps the
           * metadata dump explicit after the structural dump resets
           * `search_path`.
           */
          `--table=public.${tableName}`,
          `--host=${connection.host}`,
          `--port=${connection.port}`,
          `--username=${connection.user}`,
          `--dbname=${connection.database}`,
        ],
        {
          env: {
            ...process.env,
            PGPASSWORD: connection.password,
          },
        }
      )

      const normalizedOutput = this.removeUnsupportedSessionSettings(output).trim()
      if (normalizedOutput) {
        statements.push(normalizedOutput)
      }
    }

    return statements.join('\n\n')
  }

  /**
   * Load the schema dump using `psql`.
   */
  async load(path: string) {
    const connection = this.#normalizeCliConnection()

    /**
     * PostgreSQL schema dumps contain psql-specific commands emitted by
     * `pg_dump`. Executing the file directly keeps the restore flow aligned
     * with how the tool expects to process that output.
     */
    await this.spawnCommand(
      'psql',
      [
        `--file=${path}`,
        '--set=ON_ERROR_STOP=on',
        `--host=${connection.host}`,
        `--port=${connection.port}`,
        `--username=${connection.user}`,
        `--dbname=${connection.database}`,
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: connection.password,
        },
      }
    )
  }

  /**
   * Remove session-level settings that are not understood by older PostgreSQL
   * server versions.
   */
  private removeUnsupportedSessionSettings(output: string) {
    return output.replace(/^SET transaction_timeout = 0;\r?\n/gimu, '')
  }

  /**
   * Normalize the final SQL dump before it is consumed by `psql`.
   */
  private async normalizeDump(path: string) {
    const output = await readFile(path, 'utf-8')
    await writeFile(path, this.removeUnsupportedSessionSettings(output).trim() + '\n', 'utf-8')
  }
}
