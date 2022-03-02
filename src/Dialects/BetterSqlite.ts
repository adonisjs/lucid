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
import { BaseSqliteDialect } from './SqliteBase'

export class BetterSqliteDialect extends BaseSqliteDialect implements DialectContract {
  public readonly name = 'better-sqlite3'
}
