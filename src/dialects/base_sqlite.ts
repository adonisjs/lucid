/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type {
  DialectContract,
  QueryClientContract,
  SharedConfigNode,
  DialectAdministrationContract,
} from '../types/database.js'

export abstract class BaseSqliteDialect implements DialectContract {
  /**
   * Database level administration operations for the dialect.
   * The database lives inside a file on disk, created and
   * removed from the filesystem directly
   */
  static administration: DialectAdministrationContract = {
    usesFileDatabase: true,
  }

  abstract readonly name: 'sqlite3' | 'better-sqlite3' | 'libsql'
  readonly supportsAdvisoryLocks = false
  readonly supportsViews = true
  readonly supportsTypes = false
  readonly supportsDomains = false
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
   * Returns a filter function to omit tables, views and
   * types from the excludeList
   */
  #omitFromExcludeList(excludeList?: string[]) {
    if (!excludeList) {
      return () => true
    }
    return (name: string): boolean => {
      return !excludeList.includes(name)
    }
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

  async getAllTablesWithSchema(): Promise<{ name: string; schema?: string }[]> {
    const tables = await this.getAllTables()
    return tables.map((name) => ({ name }))
  }

  /**
   * Returns the primary key column names for a given table
   */
  async getPrimaryKeys(tableName: string): Promise<string[]> {
    const ref = this.client.getWriteClient().ref(tableName).toSQL().sql
    const result = await this.client.rawQuery(`PRAGMA table_info(${ref})`)
    return result
      .filter((row: any) => row.pk > 0)
      .sort((a: any, b: any) => a.pk - b.pk)
      .map((row: any) => row.name)
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
   * Returns an array of all domains names
   */
  async getAllDomains(): Promise<string[]> {
    throw new Error("Sqlite doesn't support domains")
  }

  /**
   * Truncate SQLITE tables
   */
  async truncate(table: string) {
    return this.client.knexQuery().table(table).truncate()
  }

  /**
   * Truncates all the tables that are in the database.
   *
   * You may exclude certain tables from getting truncated by providing them
   * under the "excludeTables" list.
   *
   * @example
   * ```ts
   * // Truncate all tables
   * await dialect.truncateAllTables()
   *
   * // Exclude the users table
   * await dialect.truncateAllTables(['users'])
   * ```
   */
  async truncateAllTables(excludeTables?: string[]): Promise<void> {
    const tables = await this.getAllTables()
    const knex = this.client.getWriteClient()

    /**
     * Collecting the tables to be dropped. We ignore tables from the exclude
     * tables list.
     */
    const tablesToTrunacte = tables.filter(this.#omitFromExcludeList(excludeTables))

    if (tablesToTrunacte.length) {
      const pragma = await knex.raw('PRAGMA foreign_keys;')
      const hasForeignKeys = pragma[0].foreign_keys === 1
      if (hasForeignKeys) {
        await knex.raw('PRAGMA foreign_keys = OFF;')
      }

      try {
        for (let table of tablesToTrunacte) {
          await knex.table(table).truncate()
        }
      } finally {
        if (hasForeignKeys) {
          await knex.raw('PRAGMA foreign_keys = ON;')
        }
      }
    }
  }

  /**
   * Drop all tables inside the database
   */
  async dropAllTables() {
    const tables = await this.getAllTables()

    /**
     * Check for foreign key pragma and turn it off if enabled
     * so that we can drop tables without any issues
     */
    const pragma = await this.client.rawQuery('PRAGMA foreign_keys;')
    if (pragma[0].foreign_keys === 1) {
      await this.client.rawQuery('PRAGMA foreign_keys = OFF;')
    }

    /**
     * Drop all tables
     */
    const knex = this.client.getWriteClient()
    const promises = tables
      .filter((table) => !this.config.wipe?.ignoreTables?.includes(table))
      .map((table) => {
        const ref = knex.ref(table).toSQL().sql
        return this.client.rawQuery(`DROP TABLE ${ref};`)
      })

    await Promise.all(promises)

    /**
     * Restore foreign key pragma to it's original value
     */
    if (pragma[0].foreign_keys === 1) {
      await this.client.rawQuery('PRAGMA foreign_keys = ON;')
    }
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
   * Drop all custom domains inside the database
   */
  async dropAllDomains(): Promise<void> {
    throw new Error("Sqlite doesn't support domains")
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
