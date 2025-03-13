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
import { ColumnInfo } from '../types/common.js'
import type { Connection } from '../connection/connection.js'
import { AbstractDialect } from './abstract_dialect.js'
import type { PGConfigOptions } from '../types/connection.js'

/**
 * PostgreSQL types with static values. The list contains
 * only the types we want to re-map to the "ColumnInfo.type".
 */
const PG_STATIC_TYPES: Record<string, ColumnInfo['type']> = {
  'smallint': 'number',
  'integer': 'number',
  'bigint': 'bigInt',
  'decimal': 'number',
  'numeric': 'number',
  'real': 'number',
  'double precision': 'number',
  'smallserial': 'number',
  'serial': 'number',
  'bigserial': 'bigInt',
  'money': 'bigInt',
  'character varying': 'string',
  'character': 'string',
  'bpchar': 'string',
  'text': 'string',
  'timestamp': 'dateTime',
  'date': 'date',
  'time': 'time',
  'interval': 'string',
  'boolean': 'boolean',
  'cidr': 'string',
  'inet': 'string',
  'macaddr': 'string',
  'macaddr8': 'string',
  'uuid': 'string',
}

/**
 * PostgreSQL remapping for types with attributes.
 */
const PG_VARYING_REMAPS = [
  {
    matches: 'bit',
    type: 'bit',
  },
  {
    matches: 'character',
    type: 'character',
  },
  {
    matches: 'interval',
    type: 'interval',
  },
  {
    matches: 'numeric',
    type: 'numeric',
  },
  {
    matches: 'time',
    type: 'time',
  },
  {
    matches: 'timestamp',
    type: 'timestamp',
  },
]

export class PgDialect extends AbstractDialect {
  #connection: Connection
  declare protected config: PGConfigOptions

  name: 'postgres' = 'postgres'
  supportsViews: boolean = true
  supportsTypes: boolean = true
  supportsAdvisoryLocks: boolean = true
  supportsReturningStatement: boolean = true

  dateFormat: string = 'yyyy-MM-dd'
  dateTimeFormat: string = "yyyy-MM-dd'T'HH:mm:ss.SSSZZ"

  constructor(connection: Connection) {
    super(connection.config)
    this.#connection = connection
  }

  /**
   * Parses a PostgreSQL identifier and extracts the
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
    const query = knex
      .from('pg_catalog.pg_tables')
      .select(['tablename as name', 'schemaname as schema'])
      .whereNotIn('schemaname', ['pg_catalog', 'information_schema'])
      .orderBy('tablename', 'asc')

    if (searchPath) {
      query.whereIn('schemaname', searchPath)
    }

    return query
  }

  /**
   * Creates the query to search for views
   */
  #compileGetAllViewsQuery(searchPath?: string[]) {
    const query = this.#connection
      .client!.from('pg_catalog.pg_views')
      .select(['viewname as name', 'schemaname as schema', 'definition'])
      .whereNotIn('schemaname', ['pg_catalog', 'information_schema'])
      .orderBy('viewname')

    if (searchPath) {
      query.whereIn('schemaname', searchPath)
    }

    return query
  }

  /**
   * Creates the query to search for types (including domains)
   */
  #compileGetAllTypesQuery(searchPath?: string[]) {
    const knex = this.#connection.getWriteClient()

    const query = knex
      .from('pg_catalog.pg_type as t')
      .leftJoin('pg_catalog.pg_namespace as n', 'n.oid', 't.typnamespace')
      .select([
        'n.nspname as schema',
        't.typname as name',
        't.typtype as type',
        't.typcategory as category',
      ])
      .where((subquery) => {
        subquery
          .where('t.typrelid', 0)
          .orWhere(
            knex.raw(
              `(SELECT c.relkind = 'c' FROM pg_catalog.pg_class as c WHERE c.oid = t.typrelid)`
            )
          )
      })
      .whereNotExists(
        knex
          .from('pg_catalog.pg_type as el')
          .select(knex.raw(1))
          .where('el.oid', knex.ref('t.typelem'))
          .where('el.typarray', knex.ref('t.oid'))
      )
      .whereNotIn('n.nspname', ['pg_catalog', 'information_schema'])

    if (searchPath) {
      query.whereIn('n.nspname', searchPath)
    }

    return query
  }

  /**
   * Creates the query to find all columns of a table.
   */
  #compileAllColumnsQuery(table: string) {
    const knex = this.#connection.getWriteClient()

    const query = knex
      .from('pg_attribute AS a')
      .select([
        'a.attname AS name',
        't.typname AS type_name',
        knex.raw('format_type(a.atttypid, a.atttypmod) AS type'),
        'a.attnotnull AS not_nullable',
        't.typtype AS type_code',
        knex.raw(`
        CASE
          WHEN t.typtype = 'd' THEN format_type(t.typbasetype, t.typtypmod)
        END AS domain_type
      `),
        knex.raw(`
        CASE
          WHEN t.typtype = 'd' THEN NOT t.typnotnull
        END AS domain_nullable
      `),
        knex.raw(`
        CASE
          WHEN t.typtype = 'e' THEN (
            SELECT
              array_to_json(array_agg(
                e.enumlabel
                ORDER BY
                  e.enumsortorder
              )) AS enum_value
            FROM
              pg_enum AS e
            WHERE
              a.atttypid = e.enumtypid
          )
        END AS enum_value
      `),
      ])
      .innerJoin('pg_type as t', 't.oid', 'a.atttypid')
      .where('a.attrelid', knex.raw(`?::regclass`, [table]))
      .andWhere('a.attnum', '>', 0)
      .andWhereNot('a.attisdropped', true)

    return query as Knex.QueryBuilder<
      {},
      {
        name: string
        type_name: string
        type: string
        not_nullable: boolean
        type_code: 'b' | 'd' | 'c' | 'e' | 'r' | 'm' | 'p'
        domain_type: string | null
        domain_nullable: boolean | null
        enum_value: string[] | null
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
    return ({ name, schema }: { name: string; schema: string }): boolean => {
      return !(excludeList.includes(`${schema}.${name}`) || excludeList.includes(name))
    }
  }

  /**
   * Returns a list of all the tables including the tables referencing
   * a partitioned table.
   *
   * The tables are filtered by the searchPath either by the provided
   * argument or from the searchPath defined in the connection
   * config.
   *
   * @example
   * ```ts
   * await dialect.getAllTables()
   *
   * // Within a specific searchPath
   * await dialect.getAllTables(['public'])
   * ```
   */
  async getAllTables(searchPath?: string[]): Promise<
    {
      schema: string
      name: string
    }[]
  > {
    searchPath = searchPath ?? this.config.searchPath

    const tables = await this.#compileGetTablesQuery(searchPath)
    debug('%s: getAllTables %O', this.#connection.identifier, tables)
    return tables.map(({ schema, name }) => {
      return {
        schema,
        name,
      }
    })
  }

  /**
   * Returns all the views from the database for all the schema.
   *
   * The views are filtered by the searchPath either by the provided
   * argument or from the searchPath defined in the connection
   * config.
   *
   * @example
   * ```ts
   * await dialect.getAllViews()
   *
   * // Within a specific searchPath
   * await dialect.getAllViews(['public'])
   * ```
   */
  async getAllViews(
    searchPath?: string[]
  ): Promise<{ name: string; schema: string; definition: string }[]> {
    searchPath = searchPath ?? this.config.searchPath
    const views = await this.#compileGetAllViewsQuery(searchPath)

    debug('%s: getAllViews %O', this.#connection.identifier, views)
    return views.map(({ schema, name, definition }) => {
      return {
        schema,
        name,
        definition,
      }
    })
  }

  /**
   * Returns all custom types including enums, domains, composite types and
   * so on.
   *
   * The types are filtered by the searchPath either by the provided
   * argument or from the searchPath defined in the connection
   * config.
   *
   * Based on "\dt" psql command.
   *
   * @example
   * ```ts
   * await dialect.getAllTypes()
   *
   * // Within a specific searchPath
   * await dialect.getAllTypes(['public'])
   * ```
   */
  async getAllTypes(searchPath?: string[]): Promise<
    {
      name: string
      schema: string
      type: string
      category: string
    }[]
  > {
    searchPath = searchPath ?? this.config.searchPath
    const types = await this.#compileGetAllTypesQuery(searchPath)

    debug('%s: getAllTypes %O', this.#connection.identifier, types)
    return types.map(({ schema, name, type, category }) => {
      return {
        schema,
        name,
        type,
        category,
      }
    })
  }

  /**
   * Returns an array of columns for a given table.
   *
   * @example
   * ```ts
   * dialect.getAllColumns('users')
   *
   * // Get from a specific schema
   * dialect.getAllColumns('search.users')
   * ```
   */
  async getAllColumns(table: string): Promise<ColumnInfo[]> {
    const columns = await this.#compileAllColumnsQuery(table)
    debug('%s: getColumns %O', this.#connection.identifier, columns)

    return columns.map((column) => {
      const columnInfo: ColumnInfo = {
        name: column.name,
        type: PG_STATIC_TYPES[column.type] ?? 'any',
        dialectType: column.type,
        nullable: !column.not_nullable,
        optional: false,
      }

      /**
       * Overrides when column type is an enum
       */
      if (column.type_code === 'e') {
        columnInfo.type = 'enum'
        columnInfo.enumOptions = column.enum_value ?? []
      }

      /**
       * Overrides when column type is a domain
       */
      if (column.type_code === 'd') {
        columnInfo.type = PG_STATIC_TYPES[column.domain_type!] ?? 'any'
        if (columnInfo.nullable && !column.domain_nullable) {
          columnInfo.nullable = false
        }
      }

      /**
       * Remap types when unable to map a type from the
       * static list
       */
      if (columnInfo.type === 'any') {
        const match = PG_VARYING_REMAPS.find(({ matches }) => column.type.startsWith(matches))
        if (match) {
          columnInfo.type = PG_STATIC_TYPES[match.type] ?? 'any'
        }
      }

      return columnInfo
    })
  }

  /**
   * Returns true when a view exists inside the database. The search
   * can be limited to specific schemas by either prefixing the
   * view name with the schema name, or by providing an array
   * of searchPaths.
   *
   * @example
   * ```ts
   * await dialect.hasView('voters')
   *
   * // Within a specific searchPath
   * await dialect.hasView('voters', ['public', 'reports'])
   *
   * // Prefix schema name to search within a specific schema
   * await dialect.hasView('public.voters')
   * ```
   */
  async hasView(viewName: string, searchPath?: string[]): Promise<boolean> {
    const { schema, resource } = this.#parseResourceIdentifier(viewName)

    /**
     * Limit the search to the schema that is mentioned within
     * the view name or the one's provided via the "schemas"
     * array.
     */
    const schemasToSearch = schema ? [schema] : (searchPath ?? this.config.searchPath ?? ['public'])

    /**
     * Check if there are one or more rows for the given view
     * name
     */
    const views = await this.#compileGetAllViewsQuery(schemasToSearch).where('viewname', resource)
    return !!views.length
  }

  /**
   * Returns true when a table exists inside the database. The search
   * can be limited to specific schemas by either prefixing the
   * table name with the schema name, or by providing an array
   * of searchPaths.
   *
   * @example
   * ```ts
   * await dialect.hasTable('users')
   *
   * // Within a specific searchPath
   * await dialect.hasTable('users', ['public', 'reports'])
   *
   * // Prefix schema name to search within a specific schema
   * await dialect.hasTable('public.users')
   * ```
   */
  async hasTable(tableName: string, searchPath?: string[]): Promise<boolean> {
    const { schema, resource } = this.#parseResourceIdentifier(tableName)

    /**
     * Limit the search to the schema that is mentioned within
     * the table name or the one's provided via the "schemas"
     * array.
     */
    const schemasToSearch = schema ? [schema] : (searchPath ?? this.config.searchPath ?? ['public'])

    /**
     * Check if there are one or more rows for the given table
     * name
     */
    const tables = await this.#compileGetTablesQuery(schemasToSearch).where('tablename', resource)
    return !!tables.length
  }

  /**
   * Drops all the tables that are in the database.
   *
   * The tables will be filtered by the searchPath either by the provided
   * argument or from the searchPath defined in the connection config.
   *
   * You may exclude certain tables from getting dropped by providing them
   * under the "excludeTables" list. Table names may be prefixed with
   * the schema name to exclude tables from a specific schema.
   *
   * @example
   * ```ts
   * // Drop all tables from the public schema or globally
   * // configured searchPath
   * await dialect.dropAllTables()
   *
   * // Exclude the users table across all the schemas
   * await dialect.dropAllTables(['users'])
   *
   * // Exclude users table only within the public schema
   * await dialect.dropAllTables(['public.users'])
   *
   * // Drop tables only from the public schema
   * await dialect.dropAllTables([], ['public'])
   *
   * // Drop tables only from the public schema and exclude the
   * // users table
   * await dialect.dropAllTables(['users'], ['public'])
   * ```
   */
  async dropAllTables(excludeTables?: string[], searchPath?: string[]): Promise<void> {
    /**
     * When dropping tables, we only drop them from the explicitly
     * provided searchPaths or from the public schema
     */
    searchPath = searchPath ?? this.config.searchPath ?? ['public']

    /**
     * Do not rely on "wipe.ignoreTables", since this method has usage
     * beyond the wipe command
     */
    excludeTables = excludeTables ?? ['spatial_ref_sys']

    const tables = await this.getAllTables(searchPath)
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting the tables to be dropped. We ignore tables from the exclude
     * tables list.
     */
    const tablesToDrop = tables
      .filter(this.#omitFromExcludeList(excludeTables))
      .map((table) => knex.ref(`${table.schema}.${table.name}`).toSQL().sql)

    if (tablesToDrop.length) {
      await knex.schema!.raw(`DROP TABLE ${tablesToDrop.join(',')} CASCADE;`)
    }
  }

  /**
   * Drops all the views that are in the database.
   *
   * The views will be filtered by the searchPath either by the provided
   * argument or from the searchPath defined in the connection config.
   *
   * You may exclude certain views from getting dropped by providing them
   * under the "excludeViews" list. Views names may be prefixed with
   * the schema name to exclude views from a specific schema.
   *
   * @example
   * ```ts
   * // Drop all views from the public schema or globally
   * // configured searchPath
   * await dialect.dropAllViews()
   *
   * // Exclude the reports views across all the schemas
   * await dialect.dropAllViews(['reports'])
   *
   * // Exclude reports view only within the public schema
   * await dialect.dropAllViews(['public.reports'])
   *
   * // Drop views only from the public schema
   * await dialect.dropAllViews([], ['public'])
   *
   * // Drop views only from the public schema and exclude the
   * // reports view
   * await dialect.dropAllViews(['reports'], ['public'])
   * ```
   */
  async dropAllViews(excludeViews?: string[], searchPath?: string[]): Promise<void> {
    /**
     * When dropping tables, we only drop them from the explicitly
     * provided searchPaths or from the public schema
     */
    searchPath = searchPath ?? this.config.searchPath ?? ['public']

    const views = await this.getAllViews(searchPath)
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting the views to be dropped. We ignore views from the exclude
     * views list.
     */
    const viewsToDrop = views
      .filter(this.#omitFromExcludeList(excludeViews))
      .map((view) => knex.ref(`${view.schema}.${view.name}`).toSQL().sql)

    if (viewsToDrop.length) {
      await knex.schema!.raw(`DROP VIEW ${viewsToDrop.join(',')} CASCADE;`)
    }
  }

  /**
   * Drops all the types (including domains) that are in the database.
   *
   * The types will be filtered by the searchPath either by the provided
   * argument or from the searchPath defined in the connection config.
   *
   * You may exclude certain types from getting dropped by providing them
   * under the "excludeTypes" list. Types names may be prefixed with
   * the schema name to exclude types from a specific schema.
   *
   * @example
   * ```ts
   * // Drop all types from the public schema or globally
   * // configured searchPath
   * await dialect.dropAllTypes()
   *
   * // Exclude the "user_roles_enum" type across all the schemas
   * await dialect.dropAllTypes(['user_roles_enum'])
   *
   * // Exclude "user_roles_enum" type only within the public schema
   * await dialect.dropAllTypes(['public.user_roles_enum'])
   *
   * // Drop types only from the public schema
   * await dialect.dropAllTypes([], ['public'])
   *
   * // Drop types only from the public schema and exclude the
   * // user_roles_enum type
   * await dialect.dropAllTypes(['user_roles_enum'], ['public'])
   * ```
   */
  async dropAllTypes(excludeTypes?: string[], searchPath?: string[]): Promise<void> {
    /**
     * When dropping types, we only drop them from the explicitly
     * provided searchPaths or from the public schema
     */
    searchPath = searchPath ?? this.config.searchPath ?? ['public']

    const types = await this.getAllTypes(searchPath)
    const knex = this.#connection.getWriteClient()

    /**
     * Collecting types and domains to be dropped. We ignore types from
     * the exclude types list.
     */
    const resourcesToDrop = types.filter(this.#omitFromExcludeList(excludeTypes)).reduce<{
      domains: string[]
      types: string[]
    }>(
      (result, type) => {
        if (type.category === 'd') {
          result.domains.push(knex.ref(`${type.schema}.${type.name}`).toSQL().sql)
        } else {
          result.types.push(knex.ref(`${type.schema}.${type.name}`).toSQL().sql)
        }
        return result
      },
      {
        domains: [],
        types: [],
      }
    )

    if (resourcesToDrop.types.length) {
      await knex.schema.raw(`DROP TYPE ${resourcesToDrop.types.join(',')} CASCADE;`)
    }
    if (resourcesToDrop.domains.length) {
      await knex.schema.raw(`DROP DOMAIN ${resourcesToDrop.domains.join(',')} CASCADE;`)
    }
  }

  /**
   * Truncates a given database table. When "config.cascadeTruncate" is
   * enabled, the CASCADE PG option will be used.
   */
  async truncate(table: string): Promise<void> {
    const knex = this.#connection.getWriteClient()
    if (this.config.cascadeTruncate) {
      await knex.schema.raw(`TRUNCATE ${knex.ref(table).toSQL().sql} RESTART IDENTITY CASCADE;`)
    } else {
      await knex.schema.raw(`TRUNCATE ${knex.ref(table).toSQL().sql} RESTART IDENTITY;`)
    }
  }

  /**
   * Truncates all the tables that are in the database.
   *
   * The tables will be filtered by the searchPath either by the provided
   * argument or from the searchPath defined in the connection config.
   *
   * You may exclude certain tables from getting truncated by providing them
   * under the "excludeTables" list. Table names may be prefixed with
   * the schema name to exclude tables from a specific schema.
   *
   * @example
   * ```ts
   * // Truncate all tables from the public schema or globally
   * // configured searchPath
   * await dialect.truncateAllTables()
   *
   * // Exclude the users table across all the schemas
   * await dialect.truncateAllTables(['users'])
   *
   * // Exclude users table only within the public schema
   * await dialect.truncateAllTables(['public.users'])
   *
   * // Truncate tables only from the public schema
   * await dialect.truncateAllTables([], ['public'])
   *
   * // Truncate tables only from the public schema and exclude the
   * // users table
   * await dialect.truncateAllTables(['users'], ['public'])
   * ```
   */
  async truncateAllTables(excludeTables?: string[], searchPath?: string[]): Promise<void> {
    /**
     * When truncating tables, we only truncate them from the explicitly
     * provided searchPaths or from the public schema
     */
    searchPath = searchPath ?? this.config.searchPath ?? ['public']

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
        await trx.schema.raw('SET CONSTRAINTS ALL DEFERRED;')
        await trx.schema.raw(`TRUNCATE ${tablesToTrunacte.join(',')};`)
        await trx.schema.raw('SET CONSTRAINTS ALL IMMEDIATE;')
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
  async getAdvisoryLock(key: string | number): Promise<boolean> {
    const response = await this.#connection
      .getWriteClient()
      .raw(`SELECT PG_TRY_ADVISORY_LOCK(hashtext('${key}')) as lock_status;`)

    return response.rows[0]?.lock_status === true
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
      .raw(`SELECT PG_ADVISORY_UNLOCK(hashtext('${key}')) as lock_status;`)

    return response.rows[0]?.lock_status === true
  }
}
