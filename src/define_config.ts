/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type {
  PGConfigOptions,
  ConnectionConfig,
  MySQL2ConfigOptions,
  TediousConfigOptions,
  BetterSQLiteConfigOptions,
} from './types/connection.js'

export const clients = {
  /**
   * Define connection options for the "mysql2" client. Make sure
   * to install the following packages first.
   *
   * ```sh
   * npm i mysql2
   * ```
   */
  mysql2(options: Omit<MySQL2ConfigOptions, 'clientName' | 'dialectName' | 'client'>) {
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
  pg(options: Omit<PGConfigOptions, 'clientName' | 'dialectName' | 'client'>) {
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
  betterSqlite3(options: Omit<BetterSQLiteConfigOptions, 'clientName' | 'dialectName' | 'client'>) {
    return {
      clientName: 'better-sqlite3',
      dialectName: 'sqlite3',
      client: 'better-sqlite3',
      ...options,
    } satisfies ConnectionConfig
  },

  /**
   * Define connection options for the "tedious" client. Make sure
   * to install the following packages first.
   *
   * ```sh
   * npm i tedious
   * ```
   */
  mssql(options: Omit<TediousConfigOptions, 'clientName' | 'dialectName' | 'client'>) {
    return {
      clientName: 'mssql',
      dialectName: 'mssql',
      client: 'mssql',
      ...options,
    } satisfies ConnectionConfig
  },
}
