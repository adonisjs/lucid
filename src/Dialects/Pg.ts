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
  public supportsAdvisoryLocks = true

  constructor (private _client: QueryClientContract) {
  }

  /**
   * Attempts to add advisory lock to the database and
   * returns it's status.
   */
  public async getAdvisoryLock (key: string): Promise<boolean> {
    const response = await this._client.raw(`SELECT PG_TRY_ADVISORY_LOCK('${key}') as lock_status;`)
    return response.rows[0] && response.rows[0].lock_status === true
  }

  /**
   * Releases the advisory lock
   */
  public async releaseAdvisoryLock (key: string): Promise<boolean> {
    const response = await this._client.raw(`SELECT PG_ADVISORY_UNLOCK('${key}') as lock_status;`)
    return response.rows[0] && response.rows[0].lock_status === true
  }
}
