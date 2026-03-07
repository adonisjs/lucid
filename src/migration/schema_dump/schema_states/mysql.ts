/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { type MysqlConfig, type QueryClientContract } from '../../../types/database.js'
import { BaseSchemaState } from '../base_schema_state.js'

type MysqlSchemaStateConnection = NonNullable<MysqlConfig['connection']> & {
  database: string
  user: string
}

/**
 * MySQL schema dumps are delegated to `mysqldump`.
 */
export class MysqlSchemaState extends BaseSchemaState {
  constructor(
    client: QueryClientContract,
    connectionConfig: MysqlConfig,
    schemaTableName: string,
    schemaVersionsTableName: string
  ) {
    super(client, connectionConfig, schemaTableName, schemaVersionsTableName)
  }

  /**
   * Dump the structural schema using `mysqldump` and normalize the output
   * afterwards to keep the file deterministic.
   */
  protected async dumpSchema(path: string) {
    const connection = this.getConnection()

    /**
     * These flags keep the dump structural, portable and deterministic:
     *
     * - `--no-data`: dump structure only, never application rows
     * - `--routines`: keep routines as part of the structural baseline
     * - `--no-tablespaces`: avoid environment-specific tablespace statements
     * - `--skip-add-locks`: keep output deterministic and restore-friendly
     * - `--skip-comments`: remove noisy, non-structural metadata
     * - `--skip-set-charset`: avoid client-specific charset prologue noise
     * - `--tz-utc`: normalize timestamp dumping behavior
     */
    const args = [
      '--no-data',
      '--routines',
      '--no-tablespaces',
      '--skip-add-locks',
      '--skip-comments',
      '--skip-set-charset',
      '--tz-utc',
      ...this.getConnectionArguments(connection),
      connection.database,
    ]

    await this.spawnToFile('mysqldump', args, path, {
      env: this.getCommandEnv(connection),
    })

    /**
     * MySQL dumps embed the current auto-increment counter, which is runtime
     * state rather than schema structure. Stripping it keeps dumps stable.
     */
    const output = await readFile(path, 'utf-8')
    await writeFile(path, output.replace(/\s+AUTO_INCREMENT=[0-9]+/giu, '').trim() + '\n', 'utf-8')
  }

  /**
   * Load the schema dump using the `mysql` CLI.
   */
  async load(path: string) {
    const connection = this.getConnection()

    await this.spawnFromFile(
      'mysql',
      [...this.getConnectionArguments(connection), connection.database],
      path,
      {
        env: this.getCommandEnv(connection),
      }
    )
  }

  /**
   * Normalize the configured connection and ensure required fields exist.
   */
  private getConnection(): MysqlSchemaStateConnection {
    const connection = this.connectionConfig.connection as MysqlConfig['connection']
    if (!connection?.database || !connection.user) {
      throw new Error('Incomplete MySQL connection config. Cannot create schema dump')
    }

    return connection as MysqlSchemaStateConnection
  }

  /**
   * Build the shared MySQL CLI connection arguments.
   */
  private getConnectionArguments(connection: MysqlSchemaStateConnection) {
    return [
      ...(connection.socketPath ? [`--socket=${connection.socketPath}`] : []),
      ...(connection.socketPath ? [] : ['--protocol=TCP']),
      ...(connection.socketPath ? [] : [`--host=${connection.host ?? '127.0.0.1'}`]),
      ...(connection.socketPath ? [] : [`--port=${connection.port ?? 3306}`]),
      `--user=${connection.user}`,
    ]
  }

  /**
   * Build the environment variables used by the MySQL CLI tools.
   */
  private getCommandEnv(connection: MysqlSchemaStateConnection) {
    return {
      ...process.env,
      /**
       * MySQL CLI tools read passwords from `MYSQL_PWD`. This avoids leaking
       * the password as a process argument.
       */
      MYSQL_PWD: connection.password ?? '',
    }
  }
}
