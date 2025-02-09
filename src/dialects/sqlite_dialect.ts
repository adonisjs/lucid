/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debug } from '../debug.js'
import type { Connection } from '../connection.js'
import { AbstractDialect } from './abstract_dialect.js'

export class SQLiteDialect extends AbstractDialect {
  #connection: Connection

  name: string = 'sqlite3'
  supportsViews: boolean = true

  dateFormat: string = 'yyyy-MM-dd'
  dateTimeFormat: string = 'yyyy-MM-dd HH:mm:ss'

  constructor(connection: Connection) {
    super(connection.config)
    this.#connection = connection
  }

  /**
   * Creates the query to search for tables
   */
  #compileGetTablesQuery() {
    const knex = this.#connection.getWriteClient()
    const query = knex
      .from('sqlite_master')
      .select('name')
      .where('type', 'table')
      .whereNot('name', 'like', 'sqlite_%')
      .orderBy('name', 'asc')

    return query
  }

  /**
   * Creates the query to search for views
   */
  #compileGetAllViewsQuery() {
    const knex = this.#connection.getWriteClient()
    const query = knex
      .from('sqlite_master')
      .select('name', 'sql as definition')
      .where('type', 'view')
      .whereNot('name', 'like', 'sqlite_%')
      .orderBy('name', 'asc')

    return query
  }

  /**
   * Returns a filter function to omit tables, views and
   * types from the excludeList
   */
  #omitFromExcludeList(excludeList?: string[]) {
    if (!excludeList) {
      return () => true
    }
    return ({ name }: { name: string }): boolean => {
      return !excludeList.includes(name)
    }
  }

  /**
   * Returns a list of all the tables.
   *
   * @note
   * MySQL does not return partitions as they are not treated as
   * regular tables.
   *
   * @example
   * ```ts
   * await dialect.getAllTables()
   * ```
   */
  async getAllTables(): Promise<
    {
      name: string
    }[]
  > {
    const tables = await this.#compileGetTablesQuery()
    debug('%s: getAllTables %O', this.#connection.identifier, tables)
    return tables.map(({ name }) => {
      return {
        name,
      }
    })
  }

  /**
   * Returns all the views from the database.
   *
   * @example
   * ```ts
   * await dialect.getAllViews()
   * ```
   */
  async getAllViews(): Promise<{ name: string; definition: string }[]> {
    const views = await this.#compileGetAllViewsQuery()

    debug('%s: getAllViews %O', this.#connection.identifier, views)
    return views.map(({ name, definition }) => {
      return {
        name,
        definition,
      }
    })
  }

  /**
   * Returns true when a view exists inside the database.
   *
   * @example
   * ```ts
   * await dialect.hasView('voters')
   * ```
   */
  async hasView(viewName: string): Promise<boolean> {
    const views = await this.#compileGetAllViewsQuery().where('name', viewName)
    return !!views.length
  }

  /**
   * Returns true when a table exists inside the database.
   *
   * @example
   * ```ts
   * await dialect.hasTable('users')
   * ```
   */
  async hasTable(tableName: string): Promise<boolean> {
    const tables = await this.#compileGetTablesQuery().where('name', tableName)
    return !!tables.length
  }

  /**
   * Drops all the tables that are in the database.
   *
   * You may exclude certain tables from getting dropped by providing them
   * under the "exlcudeTables" list.
   *
   * @example
   * ```ts
   * // Drop all tables
   * await dialect.dropAllTables()
   *
   * // Exclude the users table across all the schemas
   * await dialect.dropAllTables(['users'])
   * ```
   */
  async dropAllTables(excludeTables?: string[]): Promise<void> {
    const tables = await this.getAllTables()
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting the tables to be dropped. We ignore tables from the exclude
     * tables list.
     */
    const tablesToDrop = tables
      .filter(this.#omitFromExcludeList(excludeTables))
      .map((table) => knex.ref(`${table.name}`).toSQL().sql)

    if (tablesToDrop.length) {
      const pragma = await knex.raw('PRAGMA foreign_keys;')
      const hasForeignKeys = pragma[0].foreign_keys === 1
      if (hasForeignKeys) {
        await knex.raw('PRAGMA foreign_keys = OFF;')
      }

      try {
        for (let table of tablesToDrop) {
          await knex.raw(`DROP TABLE ${table};`)
        }
      } finally {
        if (hasForeignKeys) {
          await knex.raw('PRAGMA foreign_keys = ON;')
        }
        await knex.raw('VACUUM;')
      }
    }
  }

  /**
   * Drops all the views that are in the database.
   *
   * You may exclude certain views from getting dropped by providing them
   * under the "exlcudeViews" list.
   *
   * @example
   * ```ts
   * // Drop all views
   * await dialect.dropAllViews()
   *
   * // Exclude the reports views
   * await dialect.dropAllViews(['reports'])
   * ```
   */
  async dropAllViews(excludeViews?: string[]): Promise<void> {
    const views = await this.getAllViews()
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting the views to be dropped. We ignore views from the exclude
     * views list.
     */
    const viewsToDrop = views
      .filter(this.#omitFromExcludeList(excludeViews))
      .map((view) => knex.ref(`${view.name}`).toSQL().sql)

    if (viewsToDrop.length) {
      for (let view of viewsToDrop) {
        await knex.raw(`DROP VIEW ${view};`)
      }
      await knex.raw('VACUUM;')
    }
  }

  /**
   * Truncates a given database table.
   */
  async truncate(table: string): Promise<void> {
    const knex = this.#connection.getWriteClient()
    return knex.table(table).truncate()
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
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting the tables to be dropped. We ignore tables from the exclude
     * tables list.
     */
    const tablesToTrunacte = tables
      .filter(this.#omitFromExcludeList(excludeTables))
      .map((table) => table.name)

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
}
