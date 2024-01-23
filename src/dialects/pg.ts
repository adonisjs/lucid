/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DialectContract, SharedConfigNode, QueryClientContract } from '../types/database.js'

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
   * Returns an array of table names for one or many schemas.
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

    await this.client.rawQuery(`DROP TABLE "${tables.join('", "')}" CASCADE;`)
  }

  /**
   * Drop all views inside the database
   */
  async dropAllViews(schemas: string[]) {
    const views = await this.getAllViews(schemas)
    if (!views.length) return

    await this.client.rawQuery(`DROP VIEW "${views.join('", "')}" CASCADE;`)
  }

  /**
   * Drop all types inside the database
   */
  async dropAllTypes(schemas: string[]) {
    const types = await this.getAllTypes(schemas)
    if (!types.length) return

    await this.client.rawQuery(`DROP TYPE "${types.join('", "')}" CASCADE;`)
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

    await this.client.rawQuery(`DROP DOMAIN "${domainsToDrop.join('", "')}" CASCADE;`)
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
