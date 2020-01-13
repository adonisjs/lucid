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

export class MssqlDialect implements DialectContract {
  public readonly name = 'mssql'
  public readonly supportsAdvisoryLocks = false

  public getAdvisoryLock (): Promise<boolean> {
    throw new Error('Support for advisory locks is not implemented for mssql. Create a PR to add the feature')
  }

  public releaseAdvisoryLock (): Promise<boolean> {
    throw new Error('Support for advisory locks is not implemented for mssql. Create a PR to add the feature')
  }
}
