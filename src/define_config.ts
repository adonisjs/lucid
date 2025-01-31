/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ConnectionConfig as PGConnectionOptions } from 'pg'
import type { ConnectionOptions as MySQL2ConnectionOptions } from 'mysql2'
import type { Options as BetterSQLiteConnectionOptions } from 'better-sqlite3'
import type { ConnectionConfig, SharedConfigOptions } from './types.js'

export const clients = {
  /**
   * Define connection options for the "mysql2" client. Make sure
   * to install the following packages first.
   *
   * ```sh
   * npm i mysql2
   * ```
   */
  mysql2(
    options: SharedConfigOptions & {
      connection: MySQL2ConnectionOptions
    }
  ) {
    return {
      clientName: 'mysql2',
      dialectName: 'mysql',
      client: 'mysql2',
      ...options,
    } satisfies ConnectionConfig
  },

  /**
   * Define connection options for the "pg" client. Make sure
   * to install the following packages first.
   *
   * ```sh
   * npm i pg @types/pg
   * ```
   */
  pg(
    options: SharedConfigOptions & {
      connection: PGConnectionOptions
    }
  ) {
    return {
      clientName: 'pg',
      dialectName: 'postgres',
      client: 'pg',
      ...options,
    } satisfies ConnectionConfig
  },

  /**
   * Define connection options for the "better-sqlite3" client. Make sure
   * to install the following packages first.
   *
   * ```sh
   * npm i better-sqlite3 @types/better-sqlite3
   * ```
   */
  betterSqlite3(
    options: SharedConfigOptions & {
      connection: {
        filename: string
        options?: BetterSQLiteConnectionOptions
      }
    }
  ) {
    return {
      clientName: 'better-sqlite3',
      dialectName: 'sqlite3',
      client: 'better-sqlite3',
      ...options,
    } satisfies ConnectionConfig
  },
}
