/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/index.ts" />

import knex from 'knex'
import dotenv from 'dotenv'
import { join } from 'path'
import { IocContract, Ioc } from '@adonisjs/fold'
import { Filesystem } from '@poppinss/dev-utils'
import { Logger } from '@adonisjs/logger/build/standalone'
import { Profiler } from '@adonisjs/profiler/build/standalone'

import {
  DatabaseContract,
  ConnectionContract,
  QueryClientContract,
  ConnectionConfigContract,
} from '@ioc:Adonis/Lucid/Database'

import {
  RawContract,
  InsertQueryBuilderContract,
  DatabaseQueryBuilderContract,
} from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

import {
  ModelContract,
  AdapterContract,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

// import { ManyToManyQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { SchemaConstructorContract } from '@ioc:Adonis/Lucid/Schema'
import { MigratorContract, MigratorOptions } from '@ioc:Adonis/Lucid/Migrator'

import { Schema } from '../src/Schema'
import { Migrator } from '../src/Migrator'
import { Adapter } from '../src/Orm/Adapter'
import { BaseModel } from '../src/Orm/BaseModel'
import { QueryClient } from '../src/QueryClient'
import { Database } from '../src/Database/index'
// import { ManyToMany } from '../src/Orm/Relations/ManyToMany/index'
import { RawQueryBuilder } from '../src/Database/QueryBuilder/Raw'
import { InsertQueryBuilder } from '../src/Database/QueryBuilder/Insert'
import { DatabaseQueryBuilder } from '../src/Database/QueryBuilder/Database'
// import { ManyToManyQueryBuilder } from '../src/Orm/Relations/ManyToMany/QueryBuilder'

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
        debug: false,
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

  const hasUsersTable = await db.schema.hasTable('users')
  if (!hasUsersTable) {
    await db.schema.createTable('users', (table) => {
      table.increments()
      table.integer('country_id')
      table.string('username').unique()
      table.string('email').unique()
      table.integer('points').defaultTo(0)
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').nullable()
    })
  }

  const hasCountriesTable = await db.schema.hasTable('countries')
  if (!hasCountriesTable) {
    await db.schema.createTable('countries', (table) => {
      table.increments()
      table.string('name')
      table.timestamps()
    })
  }

  const hasSkillsTable = await db.schema.hasTable('skills')
  if (!hasSkillsTable) {
    await db.schema.createTable('skills', (table) => {
      table.increments()
      table.string('name').notNullable()
      table.timestamps()
    })
  }

  const hasUserSkillsTable = await db.schema.hasTable('skill_user')
  if (!hasUserSkillsTable) {
    await db.schema.createTable('skill_user', (table) => {
      table.increments()
      table.integer('user_id')
      table.integer('skill_id')
      table.string('proficiency')
      table.timestamps()
    })
  }

  const hasPostsTable = await db.schema.hasTable('posts')
  if (!hasPostsTable) {
    await db.schema.createTable('posts', (table) => {
      table.increments()
      table.integer('user_id')
      table.string('title').notNullable()
      table.timestamps()
    })
  }

  const hasComments = await db.schema.hasTable('comments')
  if (!hasComments) {
    await db.schema.createTable('comments', (table) => {
      table.increments()
      table.integer('post_id')
      table.string('body')
      table.timestamps()
    })
  }

  const hasProfilesTable = await db.schema.hasTable('profiles')
  if (!hasProfilesTable) {
    await db.schema.createTable('profiles', (table) => {
      table.increments()
      table.integer('user_id')
      table.string('display_name').notNullable()
      table.timestamps()
    })
  }

  const hasIdentitiesTable = await db.schema.hasTable('identities')
  if (!hasIdentitiesTable) {
    await db.schema.createTable('identities', (table) => {
      table.increments()
      table.integer('profile_id')
      table.string('identity_name')
      table.timestamps()
    })
  }

  await db.destroy()
}

/**
 * Does cleanup removes database
 */
export async function cleanup (customTables?: string[]) {
  const db = knex(getConfig())

  if (customTables) {
    await Promise.all(customTables.map((table) => db.schema.dropTableIfExists(table)))
    return
  }

  await db.schema.dropTableIfExists('users')
  await db.schema.dropTableIfExists('countries')
  await db.schema.dropTableIfExists('skills')
  await db.schema.dropTableIfExists('skill_user')
  await db.schema.dropTableIfExists('profiles')
  await db.schema.dropTableIfExists('posts')
  await db.schema.dropTableIfExists('comments')
  await db.schema.dropTableIfExists('identities')
  await db.schema.dropTableIfExists('knex_migrations')

  await db.destroy()
}

/**
 * Reset database tables
 */
export async function resetTables () {
  const db = knex(getConfig())
  await db.table('users').truncate()
  await db.table('countries').truncate()
  await db.table('skills').truncate()
  await db.table('skill_user').truncate()
  await db.table('profiles').truncate()
  await db.table('posts').truncate()
  await db.table('comments').truncate()
  await db.table('identities').truncate()
  await db.destroy()
}

/**
 * Returns the query client typed to it's interface
 */
export function getQueryClient (
  connection: ConnectionContract,
  mode?: 'read' | 'write',
): QueryClientContract {
  return new QueryClient(mode || 'dual', connection) as QueryClientContract
}

/**
 * Returns query builder instance for a given connection
 */
export function getQueryBuilder (client: QueryClientContract) {
  return new DatabaseQueryBuilder(
    client.getWriteClient().queryBuilder(),
    client,
  ) as unknown as DatabaseQueryBuilderContract
}

/**
 * Returns raw query builder instance for a given connection
 */
export function getRawQueryBuilder (client: QueryClientContract, sql: string, bindings?: any[]) {
  const writeClient = client.getWriteClient()
  return new RawQueryBuilder(
    bindings ? writeClient.raw(sql, bindings) : writeClient.raw(sql),
    client,
  ) as unknown as RawContract
}

/**
 * Returns query builder instance for a given connection
 */
export function getInsertBuilder (client: QueryClientContract) {
  return new InsertQueryBuilder(
    client.getWriteClient().queryBuilder(),
    client,
  ) as unknown as InsertQueryBuilderContract
}

/**
 * Returns fake logger instance
 */
export function getLogger () {
  return new Logger({
    enabled: true,
    name: 'lucid',
    level: 'debug',
  })
}

/**
 * Returns profiler instance
 */
export function getProfiler (enabled: boolean = false) {
  return new Profiler({ enabled })
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

  return new Database(config, getLogger(), getProfiler()) as DatabaseContract
}

/**
 * Returns the orm adapter
 */
export function ormAdapter (db: DatabaseContract) {
  return new Adapter(db)
}

/**
 * Returns the base model with the adapter attached to it
 */
export function getBaseModel (adapter: AdapterContract, container?: IocContract) {
  BaseModel.$adapter = adapter
  BaseModel.$container = container || new Ioc()
  return BaseModel as unknown as ModelConstructorContract
}

/**
 * Fake adapter implementation
 */
export class FakeAdapter implements AdapterContract {
  public operations: any[] = []

  private _handlers: any = {
    insert: null,
    update: null,
    find: null,
    delete: null,
    findAll: null,
  }

  private _invokeHandler (
    action: keyof FakeAdapter['_handlers'],
    model: ModelContract | ModelConstructorContract,
    options?: any,
  ) {
    if (typeof (this._handlers[action]) === 'function') {
      return this._handlers[action](model, options)
    }
  }

  public query (): any {
  }

  public on (action: 'insert', handler: ((model: ModelContract) => void)): void
  public on (action: 'update', handler: ((model: ModelContract) => void)): void
  public on (action: 'delete', handler: ((model: ModelContract) => void)): void
  public on (action: 'find', handler: ((model: ModelConstructorContract, options?: any) => void)): void
  public on (action: 'findAll', handler: ((model: ModelConstructorContract, options?: any) => void)): void
  public on (
    action: string,
    handler: ((model: ModelContract) => void) | ((model: ModelConstructorContract) => void),
  ): void {
    this._handlers[action] = handler
  }

  public modelClient (): any {
  }

  public modelConstructorClient (): any {
  }

  public async insert (instance: ModelContract, attributes: any) {
    this.operations.push({ type: 'insert', instance, attributes })
    return this._invokeHandler('insert', instance)
  }

  public async delete (instance: ModelContract) {
    this.operations.push({ type: 'delete', instance })
    return this._invokeHandler('delete', instance)
  }

  public async update (instance: ModelContract, attributes: any) {
    this.operations.push({ type: 'update', instance, attributes })
    return this._invokeHandler('update', instance)
  }

  public async find (model: ModelConstructorContract, key: string, value: any, options?: any) {
    const payload: any = { type: 'find', model, key, value }
    if (options) {
      payload.options = options
    }

    this.operations.push(payload)
    return this._invokeHandler('find', model, options)
  }

  public async findAll (model: ModelConstructorContract, options?: any) {
    const payload: any = { type: 'findAll', model }
    if (options) {
      payload.options = options
    }

    this.operations.push(payload)
    return this._invokeHandler('findAll', model, options)
  }
}

/**
 * Converts a map to an object
 */
export function mapToObj<T extends any> (collection: Map<any, any>): T {
  let obj = {} as T
  collection.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

/**
 * Returns the base schema class typed to it's interface
 */
export function getBaseSchema () {
  return Schema as unknown as SchemaConstructorContract
}

/**
 * Returns instance of migrator
 */
export function getMigrator (db: DatabaseContract, app: ApplicationContract, config: MigratorOptions) {
  return new Migrator(db, app, config) as unknown as MigratorContract
}

/**
 * Split string to an array using cross platform new lines
 */
export function toNewlineArray (contents: string): string[] {
  return contents.split(/\r?\n/)
}
