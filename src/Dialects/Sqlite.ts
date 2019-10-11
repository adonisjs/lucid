/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { DialectContract } from '@ioc:Adonis/Lucid/Database'

export class SqliteDialect implements DialectContract {
  public readonly name = 'sqlite3'
  public supportsAdvisoryLocks = false

  /**
   * Attempts to add advisory lock to the database and
   * returns it's status.
   */
  public async getAdvisoryLock (): Promise<boolean> {
    throw new Error(`Sqlite doesn't support advisory locks`)
  }

  /**
   * Releases the advisory lock
   */
  public async releaseAdvisoryLock (): Promise<boolean> {
    throw new Error(`Sqlite doesn't support advisory locks`)
  }
}
