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
  public readonly supportsAdvisoryLocks = false

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  public readonly dateTimeFormat = 'yyyy-MM-dd HH:mm:ss'

  /**
   * Attempts to add advisory lock to the database and
   * returns it's status.
   */
  public getAdvisoryLock (): Promise<boolean> {
    throw new Error('Sqlite doesn\'t support advisory locks')
  }

  /**
   * Releases the advisory lock
   */
  public releaseAdvisoryLock (): Promise<boolean> {
    throw new Error('Sqlite doesn\'t support advisory locks')
  }
}
