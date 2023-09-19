/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { DialectContract, QueryClientContract, SharedConfigNode } from '../types/database.js'

export abstract class BaseSqliteDialect implements DialectContract {
  abstract readonly name: 'sqlite3' | 'better-sqlite3'
  readonly supportsAdvisoryLocks = false
  readonly supportsViews = true
  readonly supportsTypes = false
  readonly supportsReturningStatement = false

  /**
   * Reference to the database version. Knex.js fetches the version after
   * the first database query, so it will be set to undefined initially
   */
  readonly version: string

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  readonly dateTimeFormat = 'yyyy-MM-dd HH:mm:ss'

  constructor(
    private client: QueryClientContract,
    private config: SharedConfigNode
  ) {
    this.version = (this.client.getReadClient() as any).context['client'].version
  }

  /**
   * Returns an array of table names
   */
  async getAllTables() {
    const tables = await this.client
      .query()
      .from('sqlite_master')
      .select('name as table_name')
      .where('type', 'table')
      .whereNot('name', 'like', 'sqlite_%')
      .orderBy('name', 'asc')

    return tables.map(({ table_name }) => table_name)
  }

  /**
   * Returns an array of all views names
   */
  async getAllViews(): Promise<string[]> {
    const tables = await this.client
      .query()
      .from('sqlite_master')
      .select('name as table_name')
      .where('type', 'view')
      .whereNot('name', 'like', 'sqlite_%')
      .orderBy('name', 'asc')

    return tables.map(({ table_name }) => table_name)
  }

  /**
   * Returns an array of all types names
   */
  async getAllTypes(): Promise<string[]> {
    throw new Error("Sqlite doesn't support types")
  }

  /**
   * Truncate SQLITE tables
   */
  async truncate(table: string) {
    return this.client.knexQuery().table(table).truncate()
  }

  /**
   * Drop all tables inside the database
   */
  async dropAllTables() {
    await this.client.rawQuery('PRAGMA writable_schema = 1;')
    await this.client
      .knexQuery()
      .delete()
      .from('sqlite_master')
      .whereIn('type', ['table', 'index', 'trigger'])
      .whereNotIn('name', this.config.wipe?.ignoreTables || [])

    await this.client.rawQuery('PRAGMA writable_schema = 0;')
    await this.client.rawQuery('VACUUM;')
  }

  /**
   * Drop all views inside the database
   */
  async dropAllViews(): Promise<void> {
    await this.client.rawQuery('PRAGMA writable_schema = 1;')
    await this.client.rawQuery(`delete from sqlite_schema where type = 'view';`)
    await this.client.rawQuery('PRAGMA writable_schema = 0;')
    await this.client.rawQuery('VACUUM;')
  }

  /**
   * Drop all custom types inside the database
   */
  async dropAllTypes(): Promise<void> {
    throw new Error("Sqlite doesn't support types")
  }

  /**
   * Attempts to add advisory lock to the database and
   * returns it's status.
   */
  getAdvisoryLock(): Promise<boolean> {
    throw new Error("Sqlite doesn't support advisory locks")
  }

  /**
   * Releases the advisory lock
   */
  releaseAdvisoryLock(): Promise<boolean> {
    throw new Error("Sqlite doesn't support advisory locks")
  }
}
