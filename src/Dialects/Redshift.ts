/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { DialectContract, PostgreConfig, QueryClientContract } from '@ioc:Adonis/Lucid/Database'

export class RedshiftDialect implements DialectContract {
  public readonly name = 'redshift'
  public readonly supportsAdvisoryLocks = false
  public readonly supportsViews = true
  public readonly supportsTypes = true
  public readonly supportsDomains = true
  public readonly supportsReturningStatement = true

  /**
   * Reference to the database version. Knex.js fetches the version after
   * the first database query, so it will be set to undefined initially
   */
  public readonly version = this.client.getReadClient()['context']['client'].version

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  public readonly dateTimeFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZ"

  constructor(private client: QueryClientContract, private config: PostgreConfig) {}

  /**
   * Returns an array of table names for one or many schemas.
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  public async getAllTables(schemas: string[]) {
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
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  public async getAllViews(schemas: string[]) {
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
  public async getAllTypes(_schemas: string[]) {
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
  public async getAllDomains(_schemas: string[]) {
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
  public async truncate(table: string, cascade: boolean = false) {
    return cascade
      ? this.client.rawQuery(`TRUNCATE "${table}" RESTART IDENTITY CASCADE;`)
      : this.client.rawQuery(`TRUNCATE "${table}";`)
  }

  /**
   * Drop all tables inside the database
   */
  public async dropAllTables(schemas: string[]) {
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
  public async dropAllViews(schemas: string[]) {
    const views = await this.getAllViews(schemas)
    if (!views.length) return

    await this.client.rawQuery(`DROP view ${views.join(',')} CASCADE;`)
  }

  /**
   * Drop all types inside the database
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  public async dropAllTypes(schemas: string[]) {
    const types = await this.getAllTypes(schemas)
    if (!types.length) return

    await this.client.rawQuery(`DROP type ${types.join(',')};`)
  }

  /**
   * Drop all domains inside the database
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  public async dropAllDomains(schemas: string[]) {
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
  public getAdvisoryLock(): Promise<boolean> {
    throw new Error("Redshift doesn't support advisory locks")
  }

  /**
   * Redshift doesn't support advisory locks. Learn more:
   * https://tableplus.com/blog/2018/10/redshift-vs-postgres-database-comparison.html
   */
  public releaseAdvisoryLock(): Promise<boolean> {
    throw new Error("Redshift doesn't support advisory locks")
  }
}
