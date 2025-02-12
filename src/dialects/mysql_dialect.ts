/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'

import { debug } from '../debug.js'
import type { Connection } from '../connection.js'
import { AbstractDialect } from './abstract_dialect.js'
import type { ColumnInfo } from '../types/common.js'

/**
 * MySQL types with static values. The list contains
 * only the types we want to re-map to the "ColumnInfo.type".
 */
const MYSQL_STATIC_TYPES: Record<string, ColumnInfo['type']> = {
  tinyint: 'number',
  smallint: 'number',
  mediumint: 'number',
  int: 'number',
  bigint: 'bigInt',
  decimal: 'number',
  numeric: 'number',
  float: 'number',
  double: 'number',
  bit: 'number',
  date: 'date',
  time: 'time',
  datetime: 'dateTime',
  timestamp: 'dateTime',
  char: 'string',
  varchar: 'string',
  boolean: 'boolean',
  bool: 'boolean',
  tinytext: 'string',
  text: 'string',
  mediumtext: 'string',
  longtext: 'string',
}

export class MySQLDialect extends AbstractDialect {
  #connection: Connection

  name: string = 'mysql'
  supportsViews: boolean = true
  supportsAdvisoryLocks: boolean = true

  dateFormat: string = 'yyyy-MM-dd'
  dateTimeFormat: string = "yyyy-MM-dd'T'HH:mm:ss.SSSZZ"

  constructor(connection: Connection) {
    super(connection.config)
    this.#connection = connection
  }

  /**
   * Creates the query to search for tables
   */
  #compileGetTablesQuery() {
    const knex = this.#connection.getWriteClient()
    const query = this.#connection
      .getWriteClient()
      .from('information_schema.tables')
      .select('table_name as name')
      .whereIn('TABLE_TYPE', ['BASE TABLE', 'SYSTEM VERSIONED'])
      .where('table_schema', knex.raw('database()'))
      .orderBy('table_name', 'asc')

    return query
  }

  /**
   * Creates the query to search for views
   */
  #compileGetAllViewsQuery() {
    const knex = this.#connection.getWriteClient()
    const query = this.#connection
      .getWriteClient()
      .from('information_schema.views')
      .select('table_name as name', 'view_definition as definition')
      .where('table_schema', knex.raw('database()'))
      .orderBy('table_name', 'asc')

    return query
  }

  /**
   * Creates the query to find all columns of a table.
   */
  #compileAllColumnsQuery(tableName: string) {
    const knex = this.#connection.getWriteClient()

    const query = knex
      .from('information_schema.columns as c')
      .select([
        'c.COLUMN_NAME AS name',
        'c.DATA_TYPE AS type',
        'c.COLUMN_TYPE as type_name',
        'c.IS_NULLABLE AS nullable',
        knex.raw(`
          CASE
            WHEN DATA_TYPE = 'enum' THEN trim(
              LEADING 'enum'
              FROM
                column_type
            )
          END AS enum_value
        `),
      ])
      .where('c.table_name', tableName)
      .where('c.table_schema', knex.raw('database()'))

    return query as Knex.QueryBuilder<
      {},
      {
        name: string
        type_name: string
        type: string
        nullable: string
        enum_value: string | null
      }[]
    >
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
   * Returns an array of columns for a given table. You can prefix
   * the table name with a schema name to target a specific
   * schema + table.
   *
   * @example
   * ```ts
   * dialect.getAllColumns('users')
   *
   * // Target a specific schema
   * dialect.getAllColumns('users')
   * ```
   */
  async getAllColumns(tableName: string): Promise<ColumnInfo[]> {
    const columns = await this.#compileAllColumnsQuery(tableName)
    debug('%s: getColumns %O', this.#connection.identifier, columns)

    return columns.map((column) => {
      const columnInfo: ColumnInfo = {
        name: column.name,
        type: MYSQL_STATIC_TYPES[column.type] ?? 'any',
        dialectType: column.type,
        nullable: column.nullable === 'YES',
        optional: false,
      }

      /**
       * Overrides when column type is an enum
       */
      if (column.type === 'enum') {
        columnInfo.type = 'enum'
        columnInfo.enumOptions = column.enum_value
          ? column.enum_value
              .replace(/^\(|\)$/g, '')
              .split(',')
              .map((item) => item.match(/'(.*)'/)![1])
          : []
      }

      return columnInfo
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
    const views = await this.#compileGetAllViewsQuery().where('table_name', viewName)
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
    const tables = await this.#compileGetTablesQuery().where('table_name', tableName)
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
      /**
       * Cascade and truncate
       */
      const trx = await knex.transaction()

      try {
        await trx.schema.raw('SET FOREIGN_KEY_CHECKS=0;')
        await trx.schema.raw(`DROP TABLE ${tablesToDrop.join(',')};`)
        await trx.schema.raw('SET FOREIGN_KEY_CHECKS=1;')
        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
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
      await knex.schema!.raw(`DROP VIEW ${viewsToDrop.join(',')};`)
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
      const trx = await knex.transaction()
      try {
        await trx.schema.raw('SET FOREIGN_KEY_CHECKS=0;')
        for (let table of tablesToTrunacte) {
          await trx.table(table).truncate()
        }
        await trx.schema.raw('SET FOREIGN_KEY_CHECKS=1;')
        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
      }
    }
  }

  /**
   * Attempts to acquire an advisory lock using the database.
   * The return boolean value represents if the value was
   * successfully acquired or not.
   *
   * @example
   * ```ts
   * const acquired = await dialect.getAdvisoryLock('db_migrations')
   * if (acquired) {
   *   // migrate
   * }
   * ```
   */
  async getAdvisoryLock(key: string | number, timeout: number = 0): Promise<boolean> {
    const response = await this.#connection
      .getWriteClient()
      .raw(`SELECT GET_LOCK('${key}', ${timeout}) as lock_status;`)

    return response[0] && response[0][0] && response[0][0].lock_status === 1
  }

  /**
   * Attempts to release an advisory lock using the database.
   * The return boolean value represents if the value was
   * successfully released or not.
   *
   * @example
   * ```ts
   * const released = await dialect.releaseAdvisoryLock('db_migrations')
   * if (released) {
   *   // lock released
   * }
   * ```
   */
  async releaseAdvisoryLock(key: string | number): Promise<boolean> {
    const response = await this.#connection
      .getWriteClient()
      .raw(`SELECT RELEASE_LOCK('${key}') as lock_status;`)

    return response[0] && response[0][0] && response[0][0].lock_status === 1
  }
}
