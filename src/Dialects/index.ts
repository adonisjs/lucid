/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { PgDialect } from './Pg'
import { MysqlDialect } from './Mysql'
import { MssqlDialect } from './Mssql'
import { SqliteDialect } from './Sqlite'
import { OracleDialect } from './Oracle'
import { RedshiftDialect } from './Redshift'
import { BetterSqliteDialect } from './BetterSqlite'

export const dialects = {
  'mssql': MssqlDialect,
  'mysql': MysqlDialect,
  'mysql2': MysqlDialect,
  'oracledb': OracleDialect,
  'postgres': PgDialect,
  'redshift': RedshiftDialect,
  'sqlite3': SqliteDialect,
  'better-sqlite3': BetterSqliteDialect,
}
