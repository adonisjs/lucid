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

export class RedshiftDialect implements DialectContract {
  public readonly name = 'redshift'
  public readonly supportsAdvisoryLocks = false

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
