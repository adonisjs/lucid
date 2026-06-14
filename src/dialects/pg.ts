/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  type DialectContract,
  type SharedConfigNode,
  type QueryClientContract,
} from '../types/database.js'

export class PgDialect implements DialectContract {
  readonly name = 'postgres'
  readonly supportsAdvisoryLocks = true
  readonly supportsViews = true
  readonly supportsTypes = true
  readonly supportsDomains = true
  readonly supportsReturningStatement = true

  /**
   * Reference to the database version. Knex.js fetches the version after
   * the first database query, so it will be set to undefined initially
   */
  readonly version: string

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  readonly dateTimeFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZ"

  constructor(
    private client: QueryClientContract,
    private config: SharedConfigNode
  ) {
    this.version = (this.client.getReadClient() as any)['context']['client'].version
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

  #compileGetAllTables(schemas: string[]) {
    return this.client
      .query()
      .from('pg_catalog.pg_class as c')
      .join('pg_catalog.pg_namespace as n', 'n.oid', 'c.relnamespace')
      .select(['c.relname as name', 'n.nspname as schema'])
      .whereIn('c.relkind', ['r', 'p'])
      .where('c.relispartition', false)
      .whereNotIn('n.nspname', ['pg_catalog', 'information_schema'])
      .whereIn('n.nspname', schemas)
      .orderBy('c.relname', 'asc')
  }

  /**
   * Returns an array of table names for one or many schemas.
   */
  async getAllTables(schemas: string[]) {
    const tables = await this.#compileGetAllTables(schemas)
    return tables.map(({ name }) => name)
  }

  async getAllTablesWithSchema(schemas: string[]) {
    return this.#compileGetAllTables(schemas)
  }

  /**
   * Returns the primary key column names for a given table
   */
  async getPrimaryKeys(tableName: string): Promise<string[]> {
    const parts = tableName.split('.')
    const table = parts.pop()!
    const schema = parts.join('.') || 'public'

    const result = await this.client.rawQuery(
      `SELECT a.attname
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = ? AND n.nspname = ? AND i.indisprimary
       ORDER BY a.attnum`,
      [table, schema]
    )
    return result.rows.map((row: any) => row.attname)
  }

  /**
   * Returns an array of all views names for one or many schemas
   */
  async getAllViews(schemas: string[]) {
    const views = await this.client
      .query()
      .from('pg_catalog.pg_views')
      .select('viewname as view_name')
      .whereIn('schemaname', schemas)
      .orderBy('viewname', 'asc')

    return views.map(({ view_name }) => view_name)
  }

  /**
   * Returns an array of all types names
   */
  async getAllTypes(_schemas: string[]) {
    const types = await this.client
      .query()
      .select('pg_type.typname')
      .distinct()
      .from('pg_type')
      .innerJoin('pg_enum', 'pg_enum.enumtypid', 'pg_type.oid')

    return types.map(({ typname }) => typname)
  }

  /**
   * Returns an array of all domain names
   */
  async getAllDomains(_schemas: string[]) {
    const domains = await this.client
      .query()
      .select('pg_type.typname')
      .distinct()
      .from('pg_type')
      .innerJoin('pg_namespace', 'pg_namespace.oid', 'pg_type.typnamespace')
      .where('pg_type.typtype', 'd')

    return domains.map(({ typname }) => typname)
  }

  /**
   * Truncate pg table with option to cascade and restart identity
   */
  async truncate(table: string, cascade: boolean = false) {
    return cascade
      ? this.client.rawQuery(`TRUNCATE "${table}" RESTART IDENTITY CASCADE;`)
      : this.client.rawQuery(`TRUNCATE "${table}";`)
  }

  async truncateAllTables(excludeTables?: string[], schemas?: string[]): Promise<void> {
    /**
     * When truncating tables, we only truncate them from the explicitly
     * provided searchPaths or from the public schema
     */
    const searchPath = schemas ?? ['public']

    const tables = await this.#compileGetAllTables(searchPath)
    const knex = this.client.getWriteClient()

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
   * Drop all tables inside the database
   */
  async dropAllTables(schemas: string[]) {
    const allTables = await this.#compileGetAllTables(schemas)
    const knex = this.client.getWriteClient()

    /**
     * Filter out tables that are not allowed to be dropped
     */
    const tablesToDrop = allTables
      .filter(this.#omitFromExcludeList(this.config.wipe?.ignoreTables || ['spatial_ref_sys']))
      .map((table) => knex.ref(`${table.schema}.${table.name}`).toSQL().sql)

    if (!tablesToDrop.length) {
      return
    }

    await this.client.rawQuery(`DROP TABLE ${tablesToDrop.join(', ')} CASCADE;`)
  }

  /**
   * Drop all views inside the database
   */
  async dropAllViews(schemas: string[]) {
    const views = await this.getAllViews(schemas)
    if (!views.length) return

    const knex = this.client.getWriteClient()
    const quotedViews = views.map((v) => knex.ref(v).toSQL().sql)
    await this.client.rawQuery(`DROP VIEW ${quotedViews.join(', ')} CASCADE;`)
  }

  /**
   * Drop all types inside the database
   */
  async dropAllTypes(schemas: string[]) {
    const types = await this.getAllTypes(schemas)
    if (!types.length) return

    const knex = this.client.getWriteClient()
    const quotedTypes = types.map((t) => knex.ref(t).toSQL().sql)
    await this.client.rawQuery(`DROP TYPE ${quotedTypes.join(', ')} CASCADE;`)
  }

  /**
   * Drop all domains inside the database
   */
  async dropAllDomains(schemas: string[]) {
    const domains = await this.getAllDomains(schemas)
    if (!domains.length) return

    // Don't drop built-in domains
    // https://www.postgresql.org/docs/current/infoschema-datatypes.html
    const builtInDomains = [
      'cardinal_number',
      'character_data',
      'sql_identifier',
      'time_stamp',
      'yes_or_no',
    ]
    const domainsToDrop = domains.filter((domain) => !builtInDomains.includes(domain))

    const knex = this.client.getWriteClient()
    const quotedDomains = domainsToDrop.map((d) => knex.ref(d).toSQL().sql)
    await this.client.rawQuery(`DROP DOMAIN ${quotedDomains.join(', ')} CASCADE;`)
  }

  /**
   * Attempts to add advisory lock to the database and
   * returns it's status.
   */
  async getAdvisoryLock(key: string): Promise<boolean> {
    const response = await this.client.rawQuery(
      `SELECT PG_TRY_ADVISORY_LOCK('${key}') as lock_status;`
    )
    return response.rows[0] && response.rows[0].lock_status === true
  }

  /**
   * Releases the advisory lock
   */
  async releaseAdvisoryLock(key: string): Promise<boolean> {
    const response = await this.client.rawQuery(
      `SELECT PG_ADVISORY_UNLOCK('${key}') as lock_status;`
    )
    return response.rows[0] && response.rows[0].lock_status === true
  }
}
