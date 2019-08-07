/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/database.ts" />

import { join } from 'path'
import * as dotenv from 'dotenv'
import { Filesystem } from '@poppinss/dev-utils'
import { ConnectionConfigContract, ConnectionContract } from '@ioc:Adonis/Addons/Database'
import {
  DatabaseQueryBuilderContract,
  RawContract,
  InsertQueryBuilderContract,
} from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

import { DatabaseQueryBuilder } from '../src/Database'
import { InsertQueryBuilder } from '../src/InsertQueryBuilder'
import { RawQueryBuilder } from '../src/RawQueryBuilder'

export const fs = new Filesystem(join(__dirname, 'tmp'))
dotenv.config()

/**
 * Returns config based upon DB set in environment variables
 */
export function getConfig (): ConnectionConfigContract {
  switch (process.env.DB) {
    case 'sqlite':
      return {
        client: 'sqlite',
        connection: {
          filename: join(fs.basePath, 'db.sqlite'),
        },
        useNullAsDefault: true,
      }
    case 'mysql':
      return {
        client: 'mysql',
        connection: {
          host: process.env.MYSQL_HOST as string,
          port: Number(process.env.MYSQL_PORT),
          database: process.env.DB_NAME as string,
          user: process.env.MYSQL_USER as string,
          password: process.env.MYSQL_PASSWORD as string,
        },
        useNullAsDefault: true,
      }
    case 'pg':
      return {
        client: 'pg',
        connection: {
          host: process.env.PG_HOST as string,
          port: Number(process.env.PG_PORT),
          database: process.env.DB_NAME as string,
          user: process.env.PG_USER as string,
          password: process.env.PG_PASSWORD as string,
        },
        useNullAsDefault: true,
      }
    default:
      throw new Error(`Missing test config for ${process.env.DB} connection`)
  }
}

/**
 * Does base setup by creating databases
 */
export async function setup () {
  if (process.env.DB === 'sqlite') {
    await fs.ensureRoot()
  }
}

/**
 * Does cleanup removes database
 */
export async function cleanup () {
  if (process.env.DB === 'sqlite') {
    await fs.cleanup()
  }
}

/**
 * Returns query builder instance for a given connection
 */
export function getQueryBuilder (connection: ConnectionContract) {
  return new DatabaseQueryBuilder(
    connection.client!.queryBuilder(),
  ) as unknown as DatabaseQueryBuilderContract
}

/**
 * Returns raw query builder instance for a given connection
 */
export function getRawQueryBuilder (connection: ConnectionContract, sql: string, bindings?: any[]) {
  return new RawQueryBuilder(
    bindings ? connection.client!.raw(sql, bindings) : connection.client!.raw(sql),
  ) as unknown as RawContract
}

/**
 * Returns query builder instance for a given connection
 */
export function getInsertBuilder (connection: ConnectionContract) {
  return new InsertQueryBuilder(
    connection.client!.queryBuilder(),
  ) as unknown as InsertQueryBuilderContract
}
