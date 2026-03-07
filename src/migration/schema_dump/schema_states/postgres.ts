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
import { normalizePostgresCliConnection } from '../helpers/postgres_connection.js'

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
   * Dump the structural schema using `pg_dump`.
   */
  protected async dumpSchema(path: string) {
    const connection = normalizePostgresCliConnection(
      this.connectionConfig.connection as PostgreConfig['connection']
    )
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
    const connection = normalizePostgresCliConnection(
      this.connectionConfig.connection as PostgreConfig['connection']
    )
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
    const connection = normalizePostgresCliConnection(
      this.connectionConfig.connection as PostgreConfig['connection']
    )

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
