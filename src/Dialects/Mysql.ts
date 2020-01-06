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

export class MysqlDialect implements DialectContract {
  public readonly name = 'mysql'
  public readonly supportsAdvisoryLocks = true

  constructor (private client: QueryClientContract) {
  }

  /**
   * Attempts to add advisory lock to the database and
   * returns it's status.
   */
  public async getAdvisoryLock (key: string, timeout: number = 0): Promise<boolean> {
    const response = await this.client.raw(`SELECT GET_LOCK('${key}', ${timeout}) as lock_status;`)
    return response[0] && response[0][0] && response[0][0].lock_status === 1
  }

  /**
   * Releases the advisory lock
   */
  public async releaseAdvisoryLock (key: string): Promise<boolean> {
    const response = await this.client.raw(`SELECT RELEASE_LOCK('${key}') as lock_status;`)
    return response[0] && response[0][0] && response[0][0].lock_status === 1
  }
}
