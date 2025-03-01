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
import type { ColumnInfo } from '../types/common.js'
import { AbstractDialect } from './abstract_dialect.js'

/**
 * SQLITE types with static values. The list contains
 * only the types we want to re-map to the "ColumnInfo.type".
 */
const SQLITE_STATIC_TYPES: Record<string, ColumnInfo['type']> = {
  'int': 'number',
  'integer': 'number',
  'tinyint': 'number',
  'smallint': 'number',
  'mediumint': 'number',
  'bigint': 'bigInt',
  'unsigned big int': 'bigInt',
  'real': 'number',
  'double': 'number',
  'double precision': 'number',
  'float': 'number',
  'int2': 'number',
  'int8': 'number',
  'numeric': 'number',
  'decimal': 'number',
  'date': 'date',
  'time': 'time',
  'datetime': 'dateTime',
  'text': 'string',
  'clob': 'string',
  'varchar': 'string',
  'character': 'string',
  'varying character': 'string',
  'nchar': 'string',
  'native character': 'string',
  'nvarchar': 'string',
}

/**
 * SQLITE remapping for types with attributes.
 */
const SQLITE_VARYING_REMAPS = [
  {
    matches: 'character',
    type: 'character',
  },
  {
    matches: 'varchar',
    type: 'varchar',
  },
  {
    matches: 'varying character',
    type: 'varying character',
  },
  {
    matches: 'nchar',
    type: 'nchar',
  },
  {
    matches: 'native character',
    type: 'native character',
  },
  {
    matches: 'nvarchar',
    type: 'nvarchar',
  },
  {
    matches: 'decimal',
    type: 'decimal',
  },
]

export class SQLiteDialect extends AbstractDialect {
  #connection: Connection

  name: 'sqlite3' = 'sqlite3'
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
   * Returns the ENUM checks for a table by parsing the SQL
   * expression for the table.
   *
   * The code is inspired by MikrORM implementation.
   */
  #extractEnumChecks(tableDefinitionSQL: string): Record<string, string[]> {
    const checkConstraints = [
      ...(tableDefinitionSQL.match(/[`["'][^`\]"']+[`\]"'] text check \(.*?\)/gi) ?? [] ?? []),
    ]

    return checkConstraints.reduce<Record<string, string[]>>((result, fragment: string) => {
      const match = fragment.match(/[`["']([^`\]"']+)[`\]"'] text check \(.* \((.*)\)/i)
      if (match) {
        const columnName = match[1]
        const options = match[2]
          .split(',')
          .map((item: string) => item.trim().match(/^\(?'(.*)'/)![1])
        result[columnName] = options
      }
      return result
    }, {})
  }

  /**
   * Returns an array of columns for the database. Issues a couple of
   * queries internally to fetch the enums and the auto increment
   * key.
   */
  async #compileAllColumns(tableName: string) {
    const knex = this.#connection.getWriteClient()

    const columns = await knex
      .from(knex.raw(`pragma_table_xinfo('${tableName}') as c`))
      .select(['c.name AS name', 'c.type AS type', 'c.notnull AS not_nullable'])

    const tableDefinition = await knex
      .from('sqlite_master')
      .select('sql')
      .where('type', 'table')
      .where('name', tableName)
      .first()

    const enumChecks = this.#extractEnumChecks(tableDefinition.sql)
    debug('%s: %s table enum checks %O', this.#connection.identifier, tableName, enumChecks)

    return columns.map((column) => {
      return {
        name: column.name,
        type: column.type.toLowerCase(),
        not_nullable: column.not_nullable,
        enum_value: enumChecks[column.name] ?? null,
      } as {
        name: string
        type: string
        not_nullable: boolean
        enum_value: string[] | null
      }
    })
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
   * Returns an array of columns for a given table.
   *
   * @example
   * ```ts
   * dialect.getAllColumns('users')
   * ```
   */
  async getAllColumns(tableName: string): Promise<ColumnInfo[]> {
    const columns = await this.#compileAllColumns(tableName)
    debug('%s: getColumns %O', this.#connection.identifier, columns)

    return columns.map((column) => {
      const columnInfo: ColumnInfo = {
        name: column.name,
        type: SQLITE_STATIC_TYPES[column.type] ?? 'any',
        dialectType: column.type,
        nullable: !column.not_nullable,
        optional: false,
      }

      /**
       * Override column type and enumOptions when enum_value
       * is available.
       */
      if (column.enum_value) {
        columnInfo.type = 'enum'
        columnInfo.enumOptions = column.enum_value ?? []
      }

      /**
       * Remap type when the type is any
       */
      if (columnInfo.type === 'any') {
        const match = SQLITE_VARYING_REMAPS.find(({ matches }) => column.type.startsWith(matches))
        if (match) {
          columnInfo.type = SQLITE_STATIC_TYPES[match.type] ?? 'any'
        }
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
