/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { PgDialect } from './pg_dialect.js'
import { MySQLDialect } from './mysql_dialect.js'
import { MSSQLDialect } from './mssql_dialect.js'
import { SQLiteDialect } from './sqlite_dialect.js'

import type { Connection } from '../connection.js'
import type { DialectContract } from '../types/dialect.js'
import type { SupportedDialectNames } from '../types/connection.js'

/**
 * Collection of supported dialects. Currently we do not allow defining custom
 * dialects
 */
export const dialects: {
  [K in SupportedDialectNames]: { new (connection: Connection): DialectContract }
} = {
  mssql: MSSQLDialect,
  postgres: PgDialect,
  mysql: MySQLDialect,
  sqlite3: SQLiteDialect,
}
