/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/database.ts" />

import knex from 'knex'
import dotenv from 'dotenv'
import { join } from 'path'
import { FakeLogger } from '@adonisjs/logger/build/standalone'
import { Profiler } from '@adonisjs/profiler/build/standalone'
import { Filesystem } from '@poppinss/dev-utils'

import {
  ConnectionConfigContract,
  QueryClientContract,
  ExcutableQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Database'

import {
  RawContract,
  InsertQueryBuilderContract,
  DatabaseQueryBuilderContract,
} from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

import { ModelConstructorContract } from '@ioc:Adonis/Lucid/Orm'

import { Adapter } from '../src/Orm/Adapter'
import { BaseModel } from '../src/Orm/BaseModel'
import { Database } from '../src/Database/index'
import { RawQueryBuilder } from '../src/Database/QueryBuilder/Raw'
import { InsertQueryBuilder } from '../src/Database/QueryBuilder/Insert'
import { DatabaseQueryBuilder } from '../src/Database/QueryBuilder/Database'

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

  const db = knex(getConfig())

  const hasTable = await db.schema.hasTable('users')
  if (!hasTable) {
    await db.schema.createTable('users', (table) => {
      table.increments()
      table.string('username')
      table.timestamps()
    })
  }

  await db.destroy()
}

/**
 * Does cleanup removes database
 */
export async function cleanup () {
  if (process.env.DB === 'sqlite') {
    await fs.cleanup()
    return
  }

  const db = knex(getConfig())
  await db.schema.dropTableIfExists('users')
  await db.destroy()
}

/**
 * Reset database tables
 */
export async function resetTables () {
  const db = knex(getConfig())
  await db.table('users').truncate()
}

/**
 * Returns query builder instance for a given connection
 */
export function getQueryBuilder (client: QueryClientContract) {
  return new DatabaseQueryBuilder(
    client.getWriteClient().queryBuilder(),
    client,
  ) as unknown as DatabaseQueryBuilderContract & ExcutableQueryBuilderContract<any>
}

/**
 * Returns raw query builder instance for a given connection
 */
export function getRawQueryBuilder (client: QueryClientContract, sql: string, bindings?: any[]) {
  const writeClient = client.getWriteClient()
  return new RawQueryBuilder(
    bindings ? writeClient.raw(sql, bindings) : writeClient.raw(sql),
    client,
  ) as unknown as RawContract & ExcutableQueryBuilderContract<any>
}

/**
 * Returns query builder instance for a given connection
 */
export function getInsertBuilder (client: QueryClientContract) {
  return new InsertQueryBuilder(
    client.getWriteClient().queryBuilder(),
    client,
  ) as unknown as InsertQueryBuilderContract & ExcutableQueryBuilderContract<any>
}

/**
 * Returns fake logger instance
 */
export function getLogger () {
  return new FakeLogger({
    enabled: true,
    name: 'lucid',
    level: 'info',
  })
}

/**
 * Returns profiler instance
 */
export function getProfiler () {
  return new Profiler({ enabled: false })
}

/**
 * Returns the database instance
 */
export function getDb () {
  const config = {
    connection: 'primary',
    connections: {
      primary: getConfig(),
      secondary: getConfig(),
    },
  }

  return new Database(config, getLogger(), getProfiler())
}

/**
 * Returns the orm adapter
 */
export function ormAdapter () {
  return new Adapter(getDb())
}

export function getBaseModel (adapter: Adapter) {
  BaseModel.$adapter = adapter
  return BaseModel as unknown as ModelConstructorContract
}
