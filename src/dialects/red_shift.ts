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

export class RedshiftDialect implements DialectContract {
  readonly name = 'redshift'
  readonly supportsAdvisoryLocks = false
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

  /**
   * Returns an array of table names for one or many schemas.
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  async getAllTables(schemas: string[]) {
    const tables = await this.client
      .query()
      .from('pg_catalog.pg_tables')
      .select('tablename as table_name')
      .whereIn('schemaname', schemas)
      .orderBy('tablename', 'asc')

    return tables.map(({ table_name }) => table_name)
  }

  /**
   * Returns the primary key column names for a given table
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  async getPrimaryKeys(tableName: string): Promise<string[]> {
    const result = await this.client.rawQuery(
      `SELECT a.attname
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = '${tableName}'::regclass AND i.indisprimary
       ORDER BY a.attnum`
    )
    return result.rows.map((row: any) => row.attname)
  }

  /**
   * Returns an array of all views names for one or many schemas
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
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
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
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
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
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
   * Truncate redshift table with option to cascade and restart identity.
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
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

    const tables = await this.getAllTables(searchPath)
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
    let tables = await this.getAllTables(schemas)

    /**
     * Filter out tables that are not allowed to be dropped
     */
    tables = tables.filter(
      (table) => !(this.config.wipe?.ignoreTables || ['spatial_ref_sys']).includes(table)
    )

    if (!tables.length) {
      return
    }

    await this.client.rawQuery(`DROP table ${tables.join(',')} CASCADE;`)
  }

  /**
   * Drop all views inside the database
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  async dropAllViews(schemas: string[]) {
    const views = await this.getAllViews(schemas)
    if (!views.length) return

    await this.client.rawQuery(`DROP view ${views.join(',')} CASCADE;`)
  }

  /**
   * Drop all types inside the database
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  async dropAllTypes(schemas: string[]) {
    const types = await this.getAllTypes(schemas)
    if (!types.length) return

    await this.client.rawQuery(`DROP type ${types.join(',')};`)
  }

  /**
   * Drop all domains inside the database
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
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

    await this.client.rawQuery(`DROP DOMAIN "${domainsToDrop.join('", "')}" CASCADE;`)
  }

  /**
   * Redshift doesn't support advisory locks. Learn more:
   * https://tableplus.com/blog/2018/10/redshift-vs-postgres-database-comparison.html
   */
  getAdvisoryLock(): Promise<boolean> {
    throw new Error("Redshift doesn't support advisory locks")
  }

  /**
   * Redshift doesn't support advisory locks. Learn more:
   * https://tableplus.com/blog/2018/10/redshift-vs-postgres-database-comparison.html
   */
  releaseAdvisoryLock(): Promise<boolean> {
    throw new Error("Redshift doesn't support advisory locks")
  }
}
