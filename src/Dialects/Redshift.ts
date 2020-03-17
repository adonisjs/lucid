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

export class RedshiftDialect implements DialectContract {
  public readonly name = 'redshift'
  public readonly supportsAdvisoryLocks = false

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  public readonly dateTimeFormat = 'yyyy-MM-dd\'T\'HH:mm:ss.SSSZZ'

  constructor (private client: QueryClientContract) {
  }

  /**
   * Returns an array of table names for one or many schemas.
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  public async getAllTables (schemas: string[]) {
    const tables = await this.client
      .query()
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .whereIn('schemaname', schemas)
      .orderBy('tablename', 'asc')

    return tables.map(({ tablename }) => tablename)
  }

  /**
   * Truncate redshift table with option to cascade and restart identity.
   *
   * NOTE: ASSUMING FEATURE PARITY WITH POSTGRESQL HERE (NOT TESTED)
   */
  public async truncate (table: string, cascade: boolean = false) {
    return cascade
      ? this.client.rawQuery(`TRUNCATE ${table} RESTART IDENTITY CASCADE;`)
      : this.client.rawQuery(`TRUNCATE ${table};`)
  }

  /**
   * Redshift doesn't support advisory locks. Learn more:
   * https://tableplus.com/blog/2018/10/redshift-vs-postgres-database-comparison.html
   */
  public getAdvisoryLock (): Promise<boolean> {
    throw new Error('Redshift doesn\'t support advisory locks')
  }

  /**
   * Redshift doesn't support advisory locks. Learn more:
   * https://tableplus.com/blog/2018/10/redshift-vs-postgres-database-comparison.html
   */
  public releaseAdvisoryLock (): Promise<boolean> {
    throw new Error('Redshift doesn\'t support advisory locks')
  }
}
