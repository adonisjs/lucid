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
import { LibSQLDialect } from './libsql.js'
import { SqliteDialect } from './sqlite.js'
import { OracleDialect } from './oracle.js'
import { RedshiftDialect } from './red_shift.js'
import { BetterSqliteDialect } from './better_sqlite.js'
import {
  type DialectContract,
  type SharedConfigNode,
  type QueryClientContract,
  type ConnectionContract,
  type DialectAdministrationContract,
} from '../types/database.js'

export const clientsToDialectsMapping: {
  [K in ConnectionContract['clientName']]: {
    new (client: QueryClientContract, config: SharedConfigNode): DialectContract

    /**
     * Database level administration operations. Not defined when the
     * dialect does not support creating or dropping databases
     */
    administration?: DialectAdministrationContract
  }
} = {
  'mssql': MssqlDialect,
  'mysql': MysqlDialect,
  'mysql2': MysqlDialect,
  'oracledb': OracleDialect,
  'postgres': PgDialect,
  'redshift': RedshiftDialect,
  'sqlite3': SqliteDialect,
  'libsql': LibSQLDialect,
  'better-sqlite3': BetterSqliteDialect,
}

export const clientsNames = Object.keys(
  clientsToDialectsMapping
) as ConnectionContract['clientName'][]
