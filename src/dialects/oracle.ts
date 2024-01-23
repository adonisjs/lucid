/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DialectContract, QueryClientContract } from '../types/database.js'

export class OracleDialect implements DialectContract {
  readonly name = 'oracledb'
  readonly supportsAdvisoryLocks = false
  readonly supportsViews = false
  readonly supportsTypes = false
  readonly supportsDomains = false
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
  readonly dateTimeFormat = 'yyyy-MM-dd HH:mm:ss'

  constructor(private client: QueryClientContract) {
    this.version = (this.client.getReadClient() as any)['context']['client'].version
  }

  /**
   * Not implemented yet
   */
  async getAllTables(): Promise<any> {
    throw new Error(
      '"getAllTables" method is not implemented for oracledb. Create a PR to add the feature'
    )
  }

  /**
   * Truncate pg table with option to cascade and restart identity
   */
  async truncate(table: string, cascade: boolean = false) {
    return cascade
      ? this.client.rawQuery(`TRUNCATE ${table} CASCADE;`)
      : this.client.rawQuery(`TRUNCATE ${table};`)
  }

  /**
   * Not implemented yet
   */
  async dropAllTables() {
    throw new Error(
      '"dropAllTables" method is not implemented for oracledb. Create a PR to add the feature'
    )
  }

  async getAllViews(): Promise<string[]> {
    throw new Error(
      '"getAllViews" method is not implemented for oracledb. Create a PR to add the feature.'
    )
  }

  async getAllTypes(): Promise<string[]> {
    throw new Error(
      '"getAllTypes" method is not implemented for oracledb. Create a PR to add the feature.'
    )
  }

  async getAllDomains(): Promise<string[]> {
    throw new Error(
      '"getAllDomains" method is not implemented for oracledb. Create a PR to add the feature.'
    )
  }

  async dropAllViews(): Promise<void> {
    throw new Error(
      '"dropAllViews" method is not implemented for oracledb. Create a PR to add the feature.'
    )
  }

  async dropAllTypes(): Promise<void> {
    throw new Error(
      '"dropAllTypes" method is not implemented for oracledb. Create a PR to add the feature.'
    )
  }

  async dropAllDomains(): Promise<void> {
    throw new Error(
      '"dropAllDomains" method is not implemented for oracledb. Create a PR to add the feature.'
    )
  }

  getAdvisoryLock(): Promise<boolean> {
    throw new Error(
      'Support for advisory locks is not implemented for oracledb. Create a PR to add the feature'
    )
  }

  releaseAdvisoryLock(): Promise<boolean> {
    throw new Error(
      'Support for advisory locks is not implemented for oracledb. Create a PR to add the feature'
    )
  }
}
