/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/index.ts" />

import dotenv from 'dotenv'
import { join } from 'path'
import { Chance } from 'chance'
import knex, { Knex } from 'knex'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/core/build/standalone'

import {
  ConnectionConfig,
  DatabaseContract,
  ConnectionContract,
  QueryClientContract,
  RawQueryBuilderContract,
  InsertQueryBuilderContract,
  DatabaseQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Database'

import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { SchemaConstructorContract } from '@ioc:Adonis/Lucid/Schema'
import { MigratorContract, MigratorOptions } from '@ioc:Adonis/Lucid/Migrator'
import { LucidRow, LucidModel, AdapterContract } from '@ioc:Adonis/Lucid/Orm'

import {
  DefineCallback,
  FactoryModelContract,
  FactoryManagerContract,
} from '@ioc:Adonis/Lucid/Factory'

import { Schema } from '../src/Schema'
import { Migrator } from '../src/Migrator'
import { Adapter } from '../src/Orm/Adapter'
import { Database } from '../src/Database/index'
import { QueryClient } from '../src/QueryClient'
import { BaseModel } from '../src/Orm/BaseModel'
import { FactoryModel } from '../src/Factory/FactoryModel'
import { RawQueryBuilder } from '../src/Database/QueryBuilder/Raw'
import { InsertQueryBuilder } from '../src/Database/QueryBuilder/Insert'
import { DatabaseQueryBuilder } from '../src/Database/QueryBuilder/Database'

export const fs = new Filesystem(join(__dirname, 'tmp'))
dotenv.config()

/**
 * Returns config based upon DB set in environment variables
 */
export function getConfig(): ConnectionConfig {
  switch (process.env.DB) {
    case 'sqlite':
      return {
        client: 'sqlite',
        connection: {
          filename: join(fs.basePath, 'db.sqlite'),
        },
        useNullAsDefault: true,
        debug: !!process.env.DEBUG,
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
        debug: !!process.env.DEBUG,
        useNullAsDefault: true,
      }
    case 'mysql_legacy':
      return {
        client: 'mysql',
        connection: {
          host: process.env.MYSQL_LEGACY_HOST as string,
          port: Number(process.env.MYSQL_LEGACY_PORT),
          database: process.env.DB_NAME as string,
          user: process.env.MYSQL_LEGACY_USER as string,
          password: process.env.MYSQL_LEGACY_PASSWORD as string,
        },
        debug: !!process.env.DEBUG,
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
        debug: !!process.env.DEBUG,
        useNullAsDefault: true,
      }
    case 'mssql':
      return {
        client: 'mssql',
        connection: {
          user: process.env.MSSQL_USER as string,
          server: process.env.MSSQL_SERVER as string,
          password: process.env.MSSQL_PASSWORD as string,
          database: 'master',
          options: {
            enableArithAbort: true,
          },
        },
        debug: !!process.env.DEBUG,
        pool: {
          min: 0,
          idleTimeoutMillis: 300,
        },
      }
    default:
      throw new Error(`Missing test config for ${process.env.DB} connection`)
  }
}

/**
 * Does base setup by creating databases
 */
export async function setup(destroyDb: boolean = true) {
  if (process.env.DB === 'sqlite') {
    await fs.ensureRoot()
  }

  const db = knex(Object.assign({}, getConfig(), { debug: false }))

  const hasUsersTable = await db.schema.hasTable('users')
  if (!hasUsersTable) {
    await db.schema.createTable('users', (table) => {
      table.increments()
      table.integer('country_id')
      table.string('username').unique()
      table.string('email').unique()
      table.integer('points').defaultTo(0)
      table.timestamp('joined_at', { useTz: process.env.DB === 'mssql' })
      table.integer('parent_id').nullable()
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').nullable()
    })
  }

  const hasUuidUsers = await db.schema.hasTable('uuid_users')
  if (!hasUuidUsers) {
    await db.schema.createTable('uuid_users', (table) => {
      table.uuid('id').primary()
      table.string('username').unique()
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').nullable()
    })
  }

  const hasFollowTable = await db.schema.hasTable('follows')
  if (!hasFollowTable) {
    await db.schema.createTable('follows', (table) => {
      table.increments()
      table.integer('user_id')
      table.integer('following_user_id')
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').nullable()
    })
  }

  const hasFriendsTable = await db.schema.hasTable('friends')
  if (!hasFriendsTable) {
    await db.schema.createTable('friends', (table) => {
      table.increments()
      table.string('username').unique()
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
      table.boolean('is_published').defaultTo(false)
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
      table.string('type').nullable()
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

  const hasGroupsTable = await db.schema.hasTable('groups')
  if (!hasGroupsTable) {
    await db.schema.createTable('groups', (table) => {
      table.increments()
      table.string('name').notNullable()
      table.timestamps()
    })
  }

  const hasGroupUsersTable = await db.schema.hasTable('group_user')
  if (!hasGroupUsersTable) {
    await db.schema.createTable('group_user', (table) => {
      table.increments()
      table.integer('group_id')
      table.integer('user_id')
      table.timestamps()
    })
  }

  if (destroyDb) {
    await db.destroy()
  }
}

/**
 * Does cleanup removes database
 */
export async function cleanup(customTables?: string[]) {
  const db = knex(Object.assign({}, getConfig(), { debug: false }))

  if (customTables) {
    for (let table of customTables) {
      await db.schema.dropTableIfExists(table)
    }
    await db.destroy()
    return
  }

  await db.schema.dropTableIfExists('users')
  await db.schema.dropTableIfExists('uuid_users')
  await db.schema.dropTableIfExists('follows')
  await db.schema.dropTableIfExists('friends')
  await db.schema.dropTableIfExists('countries')
  await db.schema.dropTableIfExists('skills')
  await db.schema.dropTableIfExists('skill_user')
  await db.schema.dropTableIfExists('profiles')
  await db.schema.dropTableIfExists('posts')
  await db.schema.dropTableIfExists('comments')
  await db.schema.dropTableIfExists('identities')
  await db.schema.dropTableIfExists('knex_migrations')
  await db.schema.dropTableIfExists('groups')
  await db.schema.dropTableIfExists('group_user')

  await db.destroy()
}

/**
 * Reset database tables
 */
export async function resetTables() {
  const db = knex(Object.assign({}, getConfig(), { debug: false }))
  await db.table('users').truncate()
  await db.table('uuid_users').truncate()
  await db.table('follows').truncate()
  await db.table('friends').truncate()
  await db.table('countries').truncate()
  await db.table('skills').truncate()
  await db.table('skill_user').truncate()
  await db.table('profiles').truncate()
  await db.table('posts').truncate()
  await db.table('comments').truncate()
  await db.table('identities').truncate()
  await db.table('groups').truncate()
  await db.table('group_user').truncate()
  await db.destroy()
}

/**
 * Returns the query client typed to it's interface
 */
export function getQueryClient(
  connection: ConnectionContract,
  application: ApplicationContract,
  mode?: 'read' | 'write' | 'dual'
): QueryClientContract {
  return new QueryClient(
    mode || 'dual',
    connection,
    application.container.use('Adonis/Core/Event')
  ) as QueryClientContract
}

/**
 * Returns query builder instance for a given connection
 */
export function getQueryBuilder(client: QueryClientContract) {
  return new DatabaseQueryBuilder(
    client.getWriteClient().queryBuilder(),
    client
  ) as unknown as DatabaseQueryBuilderContract
}

/**
 * Returns raw query builder instance for a given connection
 */
export function getRawQueryBuilder(client: QueryClientContract, sql: string, bindings?: any[]) {
  const writeClient = client.getWriteClient()
  return new RawQueryBuilder(
    bindings ? writeClient.raw(sql, bindings) : writeClient.raw(sql),
    client
  ) as unknown as RawQueryBuilderContract
}

/**
 * Returns query builder instance for a given connection
 */
export function getInsertBuilder(client: QueryClientContract) {
  return new InsertQueryBuilder(
    client.getWriteClient().queryBuilder(),
    client
  ) as unknown as InsertQueryBuilderContract
}

/**
 * Returns the database instance
 */
export function getDb(application: ApplicationContract) {
  const config = {
    connection: 'primary',
    connections: {
      primary: getConfig(),
      secondary: getConfig(),
    },
  }

  return new Database(
    config,
    application.container.use('Adonis/Core/Logger'),
    application.container.use('Adonis/Core/Profiler'),
    application.container.use('Adonis/Core/Event')
  ) as DatabaseContract
}

/**
 * Returns the orm adapter
 */
export function ormAdapter(db: DatabaseContract) {
  return new Adapter(db)
}

/**
 * Returns the base model with the adapter attached to it
 */
export function getBaseModel(adapter: AdapterContract, application: ApplicationContract) {
  BaseModel.$adapter = adapter
  BaseModel.$container = application.container
  return BaseModel as unknown as LucidModel
}

/**
 * Returns the factory model
 */
export function getFactoryModel() {
  return FactoryModel as unknown as {
    new <Model extends LucidModel>(
      model: Model,
      callback: DefineCallback<Model>,
      manager: FactoryManagerContract
    ): FactoryModelContract<Model>
  }
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
    refresh: null,
  }

  private _invokeHandler(
    action: keyof FakeAdapter['_handlers'],
    model: LucidRow | LucidModel,
    options?: any
  ) {
    if (typeof this._handlers[action] === 'function') {
      return this._handlers[action](model, options)
    }
  }

  public query(): any {
    return {
      client: {
        dialect: {
          dateTimeFormat: 'yyyy-MM-dd HH:mm:ss',
        },
      },
    }
  }

  public on(action: 'insert', handler: (model: LucidRow, attributes: any) => void): void
  public on(action: 'update', handler: (model: LucidRow, attributes: any) => void): void
  public on(action: 'delete', handler: (model: LucidRow) => void): void
  public on(action: 'refresh', handler: (model: LucidRow) => void): void
  public on(action: 'find', handler: (model: LucidModel, options?: any) => void): void
  public on(action: 'findAll', handler: (model: LucidModel, options?: any) => void): void
  public on(
    action: string,
    handler: ((model: LucidRow, attributes?: any) => void) | ((model: LucidModel) => void)
  ): void {
    this._handlers[action] = handler
  }

  public modelClient(): any {}

  public modelConstructorClient(): any {}

  public async insert(instance: LucidRow, attributes: any) {
    this.operations.push({ type: 'insert', instance, attributes })
    return this._invokeHandler('insert', instance, attributes)
  }

  public async refresh(instance: LucidRow) {
    this.operations.push({ type: 'refresh', instance })
    return this._invokeHandler('refresh', instance)
  }

  public async delete(instance: LucidRow) {
    this.operations.push({ type: 'delete', instance })
    return this._invokeHandler('delete', instance)
  }

  public async update(instance: LucidRow, attributes: any) {
    this.operations.push({ type: 'update', instance, attributes })
    return this._invokeHandler('update', instance, attributes)
  }

  public async find(model: LucidModel, key: string, value: any, options?: any) {
    const payload: any = { type: 'find', model, key, value }
    if (options) {
      payload.options = options
    }

    this.operations.push(payload)
    return this._invokeHandler('find', model, options)
  }

  public async findAll(model: LucidModel, options?: any) {
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
export function mapToObj<T extends any>(collection: Map<any, any>): T {
  let obj = {} as T
  collection.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

/**
 * Returns the base schema class typed to it's interface
 */
export function getBaseSchema() {
  return Schema as unknown as SchemaConstructorContract
}

/**
 * Returns instance of migrator
 */
export function getMigrator(
  db: DatabaseContract,
  app: ApplicationContract,
  config: MigratorOptions
) {
  return new Migrator(db, app, config) as unknown as MigratorContract
}

/**
 * Split string to an array using cross platform new lines
 */
export function toNewlineArray(contents: string): string[] {
  return contents.split(/\r?\n/)
}

/**
 * Returns an array of users filled with random data
 */
export function getUsers(count: number) {
  const chance = new Chance()
  return [...new Array(count)].map(() => {
    return {
      username: chance.string({ alpha: true }),
      email: chance.email(),
    }
  })
}

/**
 * Returns an array of posts for a given user, filled with random data
 */
export function getPosts(count: number, userId: number) {
  const chance = new Chance()
  return [...new Array(count)].map(() => {
    return {
      user_id: userId,
      title: chance.sentence({ words: 5 }),
    }
  })
}

/**
 * Setup application
 */
export async function setupApplication(
  dbConfig?: any,
  additionalProviders?: string[],
  environment: 'web' | 'repl' | 'test' = 'test'
) {
  await fs.add('.env', '')
  await fs.add(
    'config/app.ts',
    `
    export const appKey = 'averylong32charsrandomsecretkey',
    export const http = {
      cookie: {},
      trustProxy: () => true,
    }
  `
  )

  await fs.add(
    'config/database.ts',
    `
    const dbConfig = ${JSON.stringify(dbConfig, null, 2)}
    export default dbConfig
  `
  )

  const app = new Application(fs.basePath, environment, {
    aliases: {
      App: './app',
    },
    providers: ['@adonisjs/core', '@adonisjs/repl'].concat(additionalProviders || []),
  })

  await app.setup()
  await app.registerProviders()
  await app.bootProviders()

  if (process.env.DEBUG) {
    app.container.use('Adonis/Core/Event').on('db:query', (query) => {
      console.log({
        model: query.model,
        sql: query.sql,
        bindings: query.bindings,
      })
    })
  }

  return app
}

export async function setupReplicaDb(connection: Knex, datatoInsert: { username: string }[]) {
  const hasUsersTable = await connection.schema.hasTable('replica_users')
  if (!hasUsersTable) {
    await connection.schema.createTable('replica_users', (table) => {
      table.increments()
      table.string('username')
    })
  }

  await connection.table('replica_users').insert(datatoInsert)
}

export async function cleanupReplicaDb(connection: Knex) {
  await connection.schema.dropTable('replica_users')
}
