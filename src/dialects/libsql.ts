/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DialectContract } from '../types/database.js'
import { BaseSqliteDialect } from './base_sqlite.js'

export class LibSQLDialect extends BaseSqliteDialect implements DialectContract {
  readonly name = 'libsql'
}
