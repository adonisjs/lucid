/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { PgDialect } from './pg.js'
import { MysqlDialect } from './mysql.js'
import { MssqlDialect } from './mssql.js'
import { SqliteDialect } from './sqlite.js'
import { OracleDialect } from './oracle.js'
import { RedshiftDialect } from './red_shift.js'
import { BetterSqliteDialect } from './better_sqlite.js'
import { DialectContract, QueryClientContract, SharedConfigNode } from '../types/database.js'

export const dialects: {
  [key: string]: {
    new (client: QueryClientContract, config: SharedConfigNode): DialectContract
  }
} = {
  'mssql': MssqlDialect,
  'mysql': MysqlDialect,
  'mysql2': MysqlDialect,
  'oracledb': OracleDialect,
  'postgres': PgDialect,
  'redshift': RedshiftDialect,
  'sqlite3': SqliteDialect,
  'better-sqlite3': BetterSqliteDialect,
}
