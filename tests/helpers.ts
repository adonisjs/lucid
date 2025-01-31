/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { Env } from '@adonisjs/env'
import { fileURLToPath } from 'node:url'
import { clients } from '../src/define_config.js'

await Env.create(new URL('../', import.meta.url), {})

export const APP_ROOT = new URL('./tmp', import.meta.url)
export const SQLITE_BASE_PATH = fileURLToPath(APP_ROOT)

/**
 * Returns the config for constructing a new connection based
 * upon the "process.env.DB" value.
 */
export function getConnectionConfig() {
  switch (process.env.DB) {
    case 'sqlite':
      return clients.betterSqlite3({
        connection: {
          filename: join(SQLITE_BASE_PATH, 'better-sqlite-db.sqlite'),
        },
        useNullAsDefault: true,
        debug: !!process.env.DEBUG,
      })
    case 'mysql':
      return clients.mysql2({
        connection: {
          host: process.env.MYSQL_HOST as string,
          port: Number(process.env.MYSQL_PORT),
          database: process.env.MYSQL_DATABASE as string,
          user: process.env.MYSQL_USER as string,
          password: process.env.MYSQL_PASSWORD as string,
        },
        debug: !!process.env.DEBUG,
      })
    case 'pg':
      return clients.pg({
        connection: {
          host: process.env.PG_HOST as string,
          port: Number(process.env.PG_PORT),
          database: process.env.PG_DATABASE as string,
          user: process.env.PG_USER as string,
          password: process.env.PG_PASSWORD as string,
        },
        debug: !!process.env.DEBUG,
      })
    default:
      throw new Error(`Missing test config for ${process.env.DB} client`)
  }
}
