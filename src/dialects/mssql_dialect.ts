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
import type { Connection } from '../connection/connection.js'
import type { ColumnInfo } from '../types/common.js'
import { AbstractDialect } from './abstract_dialect.js'

/**
 * MSSQL types with static values. The list contains
 * only the types we want to re-map to the "ColumnInfo.type".
 */
const MSSQL_STATIC_TYPES: Record<string, ColumnInfo['type']> = {
  bigint: 'bigInt',
  char: 'string',
  date: 'date',
  datetime: 'dateTime',
  datetime2: 'dateTime',
  datetimeoffset: 'dateTime',
  decimal: 'number',
  float: 'number',
  int: 'number',
  money: 'bigInt',
  nchar: 'string',
  ntext: 'string',
  numeric: 'number',
  nvarchar: 'string',
  real: 'number',
  smalldatetime: 'dateTime',
  smallint: 'number',
  smallmoney: 'number',
  text: 'string',
  time: 'time',
  timestamp: 'dateTime',
  tinyint: 'number',
  uniqueidentifier: 'string',
  varchar: 'string',
  xml: 'string',
}

export class MSSQLDialect extends AbstractDialect {
  #connection: Connection
  #defaultSearchPath = ['dbo']

  name: 'mssql' = 'mssql'
  supportsViews: boolean = true
  supportsAdvisoryLocks: boolean = false
  supportsReturningStatement: boolean = true

  dateFormat: string = 'yyyy-MM-dd'
  dateTimeFormat: string = "yyyy-MM-dd'T'HH:mm:ss.SSSZZ"

  constructor(connection: Connection) {
    super(connection.config)
    this.#connection = connection
  }

  /**
   * Parses a SQL server identifier and extracts the
   * schema name from it.
   */
  #parseResourceIdentifier(resource: string) {
    const [schema, ...resourceParts] = resource.split('.')
    if (resourceParts.length) {
      return { schema, resource: resourceParts.join('.') }
    }
    return { schema: null, resource: schema }
  }

  /**
   * Creates the query to search for tables
   */
  #compileGetTablesQuery(searchPath?: string[]) {
    const knex = this.#connection.getWriteClient()
    const query = this.#connection
      .getWriteClient()
      .from('sys.tables as t')
      .select('t.name', knex.raw('schema_name(t.schema_id) as [schema]'))
      .where('t.is_ms_shipped', 0)
      .whereNot('t.name', 'sysdiagrams')
      .orderByRaw('[schema]')
      .orderBy('t.name')

    if (searchPath) {
      query.whereIn(knex.raw('schema_name(t.schema_id)') as any, searchPath)
    }

    return query
  }

  /**
   * Creates the query to search for views
   */
  #compileGetAllViewsQuery(searchPath?: string[]) {
    const knex = this.#connection.getWriteClient()
    const query = this.#connection
      .getWriteClient()
      .from('sys.views as v')
      .select('v.name', knex.raw('schema_name(v.schema_id) as [schema]'), 'definition')
      .innerJoin('sys.sql_modules as m', 'v.object_id', 'm.object_id')
      .where('v.is_ms_shipped', 0)
      .orderByRaw('[schema]')
      .orderBy('v.name')

    if (searchPath) {
      query.whereIn(knex.raw('schema_name(v.schema_id)') as any, searchPath)
    }

    return query
  }

  /**
   * Creates the query to find all columns of a table.
   */
  #compileAllColumnsQuery(tableName: string) {
    const knex = this.#connection.getWriteClient()

    const query = knex
      .from('sys.columns as col')
      .select(['col.name AS name', 'type.name AS type', 'col.is_nullable as nullable'])
      .join('sys.types as type', 'col.user_type_id', 'type.user_type_id')
      .where('col.object_id', knex.raw(`OBJECT_ID(?)`, [tableName]))

    return query as Knex.QueryBuilder<
      {},
      {
        name: string
        type: string
        nullable: boolean
      }[]
    >
  }

  /**
   * Returns a query to fetch all foreign keys pointing
   * to a set of tables and schemas
   */
  #compileGetAllForeignKeysQuery(filterBy: { name: string; schema: string }[]) {
    const knex = this.#connection.getWriteClient()
    const query = knex
      .from('sys.foreign_keys as fk')
      .select(
        'fk.name as constraint',
        'p.name as table',
        knex.raw('schema_name(t.schema_id) as [schema]')
      )
      .innerJoin('sys.tables as t', 't.object_id', 'fk.referenced_object_id')
      .innerJoin('sys.tables as p', 'p.object_id', 'fk.parent_object_id')

    filterBy.forEach(({ name, schema }) => {
      query.orWhere((subquery) => {
        subquery.where('t.name', name).andWhere(knex.raw('schema_name(t.schema_id)') as any, schema)
      })
    })

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
    return ({ name, schema }: { name: string; schema: string }): boolean => {
      return !(excludeList.includes(`${schema}.${name}`) || excludeList.includes(name))
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
  async getAllTables(searchPath?: string[]): Promise<
    {
      schema: string
      name: string
    }[]
  > {
    const tables = await this.#compileGetTablesQuery(searchPath)
    debug('%s: getAllTables %O', this.#connection.identifier, tables)
    return tables.map(({ name, schema }) => {
      return {
        name,
        schema,
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
  async getAllViews(
    searchPath?: string[]
  ): Promise<{ name: string; schema: string; definition: string }[]> {
    const views = await this.#compileGetAllViewsQuery(searchPath)

    debug('%s: getAllViews %O', this.#connection.identifier, views)
    return views.map(({ name, schema, definition }) => {
      return {
        name,
        schema,
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
   * dialect.getAllColumns('reports.users')
   * ```
   */
  async getAllColumns(tableName: string): Promise<ColumnInfo[]> {
    const columns = await this.#compileAllColumnsQuery(tableName)
    debug('%s: getColumns %O', this.#connection.identifier, columns)

    return columns.map((column) => {
      const columnInfo: ColumnInfo = {
        name: column.name,
        type: MSSQL_STATIC_TYPES[column.type] ?? 'any',
        dialectType: column.type,
        nullable: column.nullable,
        optional: false,
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
  async hasView(viewName: string, searchPath?: string[]): Promise<boolean> {
    const { schema, resource } = this.#parseResourceIdentifier(viewName)

    /**
     * Limit the search to the schema that is mentioned within
     * the view name or the one's provided via the "searchPath"
     * array.
     */
    const schemasToSearch = schema ? [schema] : (searchPath ?? this.#defaultSearchPath)
    const views = await this.#compileGetAllViewsQuery(schemasToSearch).where('v.name', resource)
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
  async hasTable(tableName: string, searchPath?: string[]): Promise<boolean> {
    const { schema, resource } = this.#parseResourceIdentifier(tableName)

    /**
     * Limit the search to the schema that is mentioned within
     * the view name or the one's provided via the "searchPath"
     * array.
     */
    const schemasToSearch = schema ? [schema] : (searchPath ?? this.#defaultSearchPath)

    const tables = await this.#compileGetTablesQuery(schemasToSearch).where('t.name', resource)
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
  async dropAllTables(excludeTables?: string[], searchPath?: string[]): Promise<void> {
    /**
     * When dropping tables, we only drop them from the explicitly
     * provided searchPaths or from the default schema
     */
    searchPath = searchPath ?? this.#defaultSearchPath

    const tables = await this.getAllTables(searchPath)
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting the tables to be dropped. We ignore tables from the exclude
     * tables list.
     */
    const tablesToDrop = tables.filter(this.#omitFromExcludeList(excludeTables))

    if (tablesToDrop.length) {
      const foreignKeys = await this.#compileGetAllForeignKeysQuery(tablesToDrop)
      const trx = await knex.transaction()

      try {
        /**
         * Dropping all the foreign keys first so that we also drop the tables.
         */
        debug('%s dropForeignKeys %O', this.#connection.identifier, foreignKeys)
        await Promise.all(
          foreignKeys.map(({ table, schema, constraint }) => {
            return trx.schema.raw(
              `ALTER TABLE ${knex.ref(`${schema}.${table}`).toSQL().sql} DROP CONSTRAINT IF EXISTS ${constraint}`
            )
          })
        )

        /**
         * Dropping all tables
         */
        debug('%s dropAllTables %O', this.#connection.identifier, tablesToDrop)
        await trx.schema.raw(
          `DROP TABLE ${tablesToDrop.map((table) => knex.ref(`${table.schema}.${table.name}`).toSQL().sql).join(',')};`
        )
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
  async dropAllViews(excludeViews?: string[], searchPath?: string[]): Promise<void> {
    /**
     * When dropping views, we only drop them from the explicitly
     * provided searchPaths or from the default schema
     */
    searchPath = searchPath ?? this.#defaultSearchPath

    const views = await this.getAllViews(searchPath)
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting the views to be dropped. We ignore views from the exclude
     * views list.
     */
    const viewsToDrop = views
      .filter(this.#omitFromExcludeList(excludeViews))
      .map((table) => knex.ref(`${table.schema}.${table.name}`).toSQL().sql)

    if (viewsToDrop.length) {
      debug('%s dropAllViews %O', this.#connection.identifier, viewsToDrop)
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
  async truncateAllTables(excludeTables?: string[], searchPath?: string[]): Promise<void> {
    /**
     * When truncating tables, we only truncate them from the explicitly
     * provided searchPaths or from the public schema
     */
    searchPath = searchPath ?? this.#defaultSearchPath

    const tables = await this.getAllTables(searchPath)
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting the tables to be dropped. We ignore tables from the exclude
     * tables list.
     */
    const tablesToTrunacte = tables
      .filter(this.#omitFromExcludeList(excludeTables))
      .map((table) => knex.ref(`${table.schema}.${table.name}`).toSQL().sql)

    if (tablesToTrunacte.length) {
      const trx = await knex.transaction()
      try {
        await trx.schema.raw(`EXEC sp_msforeachtable 'ALTER TABLE \\? NOCHECK CONSTRAINT ALL';`)
        for (let table of tablesToTrunacte) {
          await trx.schema.raw(`DELETE FROM ${table};`)
          await trx.schema.raw(`DBCC CHECKIDENT('${table}', RESEED, 0);`)
        }
        await trx.schema.raw(
          `EXEC sp_msforeachtable 'ALTER TABLE \\? WITH CHECK CHECK CONSTRAINT ALL';`
        )
        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
      }
    }
  }
}
