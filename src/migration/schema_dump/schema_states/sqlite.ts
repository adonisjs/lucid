/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { readFile, writeFile } from 'node:fs/promises'
import {
  type LibSQLConfig,
  type SqliteConfig,
  type QueryClientContract,
} from '../../../types/database.js'
import { BaseSchemaState } from '../base_schema_state.js'

/**
 * SQLite schema dumps are delegated to the `sqlite3` CLI instead of
 * reconstructing SQL manually.
 */
export class SqliteSchemaState extends BaseSchemaState {
  constructor(
    client: QueryClientContract,
    connectionConfig: SqliteConfig | LibSQLConfig,
    schemaTableName: string,
    schemaVersionsTableName: string
  ) {
    super(client, connectionConfig, schemaTableName, schemaVersionsTableName)
  }

  /**
   * Dump the structural schema using `sqlite3 .schema --indent`.
   */
  protected async dumpSchema(path: string) {
    const databasePath = this.getDatabasePath()

    await this.spawnToFile('sqlite3', [databasePath, '.schema --indent'], path)

    /**
     * The SQLite CLI includes internal bookkeeping tables in the output.
     * Strip them out, since they are not part of the user-defined schema
     * baseline.
     */
    const output = await readFile(path, 'utf-8')
    await writeFile(path, this.removeInternalTables(output).trim() + '\n', 'utf-8')
  }

  /**
   * Load the schema dump using the `sqlite3` CLI.
   */
  async load(path: string) {
    const databasePath = this.getDatabasePath()
    await this.spawnFromFile('sqlite3', [databasePath], path)
  }

  /**
   * Resolve the SQLite database path from the configured filename.
   */
  private getDatabasePath() {
    const connection = this.connectionConfig.connection as
      SqliteConfig['connection'] | LibSQLConfig['connection']
    const filename = connection?.filename

    if (!filename) {
      throw new Error('Incomplete SQLite connection config. Cannot create schema dump')
    }

    /**
     * The `sqlite3` CLI cannot read in-memory databases. We fail fast instead
     * of generating a misleading empty dump.
     */
    if (
      filename === ':memory:' ||
      filename.includes('?mode=memory') ||
      filename.includes('&mode=memory')
    ) {
      throw new Error('Cannot create a schema dump from an in-memory SQLite database')
    }

    if (filename.startsWith('file:')) {
      return decodeURIComponent(new URL(filename).pathname)
    }

    return filename
  }

  /**
   * Remove SQLite internal table definitions from the generated output.
   */
  private removeInternalTables(output: string) {
    return output.replace(/CREATE TABLE sqlite_.+?\);\s*/gis, '')
  }
}
