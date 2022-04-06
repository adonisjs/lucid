/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { DialectContract, QueryClientContract } from '@ioc:Adonis/Lucid/Database'

export class PgDialect implements DialectContract {
  public readonly name = 'postgres'
  public readonly supportsAdvisoryLocks = true
  public readonly supportsViews = true
  public readonly supportsTypes = true
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

  constructor(private client: QueryClientContract) {}

  /**
   * Returns an array of table names for one or many schemas.
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
   * Truncate pg table with option to cascade and restart identity
   */
  public async truncate(table: string, cascade: boolean = false) {
    return cascade
      ? this.client.rawQuery(`TRUNCATE ${table} RESTART IDENTITY CASCADE;`)
      : this.client.rawQuery(`TRUNCATE ${table};`)
  }

  /**
   * Drop all tables inside the database
   */
  public async dropAllTables(schemas: string[]) {
    const tables = await this.getAllTables(schemas)
    if (!tables.length) return

    await this.client.rawQuery(`DROP TABLE IF EXISTS "${tables.join('", "')}" CASCADE;`)
  }

  /**
   * Drop all views inside the database
   */
  public async dropAllViews(schemas: string[]) {
    const views = await this.getAllViews(schemas)
    if (!views.length) return

    await this.client.rawQuery(`DROP VIEW IF EXISTS "${views.join('", "')}" CASCADE;`)
  }

  /**
   * Drop all types inside the database
   */
  public async dropAllTypes(schemas: string[]) {
    const types = await this.getAllTypes(schemas)
    if (!types.length) return

    await this.client.rawQuery(`DROP TYPE IF EXISTS "${types.join('", "')}" CASCADE;`)
  }

  /**
   * Attempts to add advisory lock to the database and
   * returns it's status.
   */
  public async getAdvisoryLock(key: string): Promise<boolean> {
    const response = await this.client.rawQuery(
      `SELECT PG_TRY_ADVISORY_LOCK('${key}') as lock_status;`
    )
    return response.rows[0] && response.rows[0].lock_status === true
  }

  /**
   * Releases the advisory lock
   */
  public async releaseAdvisoryLock(key: string): Promise<boolean> {
    const response = await this.client.rawQuery(
      `SELECT PG_ADVISORY_UNLOCK('${key}') as lock_status;`
    )
    return response.rows[0] && response.rows[0].lock_status === true
  }
}
