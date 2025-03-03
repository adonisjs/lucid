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
import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { clients } from '../src/define_config.js'
import { Connection } from '../src/connection.js'

await Env.create(new URL('../', import.meta.url), {})

export const APP_ROOT = new URL('./tmp', import.meta.url)
export const SQLITE_BASE_PATH = fileURLToPath(APP_ROOT)
export const SUPPORTS_READ_WRITE_REPLICAS = ['pg', 'mysql', 'mssql'].includes(process.env.DB!)

/**
 * Returns the config for constructing a new connection based
 * upon the "process.env.DB" value.
 */
export function getConnectionConfig<T extends 'pg' | 'sqlite' | 'mysql' | 'mssql'>(
  client: T | undefined = process.env.DB as T
) {
  switch (client) {
    case 'sqlite':
      return clients.betterSqlite3({
        connection: {
          filename: join(SQLITE_BASE_PATH, 'better-sqlite-db.sqlite'),
        },
        asyncStackTraces: true,
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
        asyncStackTraces: true,
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
        asyncStackTraces: true,
        debug: !!process.env.DEBUG,
      })
    case 'mssql':
      return clients.mssql({
        connection: {
          server: process.env.MSSQL_HOST as string,
          port: Number(process.env.MSSQL_PORT! as string),
          user: process.env.MSSQL_USER as string,
          password: process.env.MSSQL_PASSWORD as string,
          database: 'master',
          options: {
            enableArithAbort: true,
          },
        },
        asyncStackTraces: true,
        debug: !!process.env.DEBUG,
      })
    default:
      throw new Error(`Config not defined by the ${client} client`)
  }
}

/**
 * Prepares tables for testing.
 */
export const dbSetup = test.macro(async (t, connection: Connection) => {
  async function cleanup() {
    await connection.client!.schema.dropTableIfExists('profiles')
    await connection.client!.schema.dropTableIfExists('skills')
    await connection.client!.schema.dropTableIfExists('users')
    await connection.client!.schema.dropTableIfExists('roles')
  }

  t.cleanup(cleanup)
  await cleanup()

  await connection.client!.schema.createTable('roles', (table) => {
    table.increments()
    table.string('name')
    table.boolean('is_default').defaultTo(false)
  })

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.createTable('users', (table) => {
    table.increments()
    table.string('first_name')
    table.string('last_name')
    table.string('username').unique()
    table.string('email').unique()
    table.integer('age').notNullable()
    table.integer('role_id').unsigned().references('roles.id').onDelete('CASCADE')
    table.string('password')
  })
  await connection.client!.schema.createTable('profiles', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.jsonb('profile_details')
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
  })
  await connection.client!.schema.createTable('skills', (table) => {
    table.increments()
    table.string('skill_name').nullable()
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
  })
})

/**
 * Prepares the PG database for testing the dialect helpers that are used
 * to scan the database for precise info. Here we create:
 *
 * - Enums
 * - Domains
 * - Composite types
 * - Views
 * - Partitioned table and tables referencing the partition
 */
export const pgSetupForScanning = test.macro(async (t, connection: Connection) => {
  async function cleanup() {
    await connection.client!.schema.dropViewIfExists('voters')
    await connection.client!.schema.dropTableIfExists('profiles')
    await connection.client!.schema.dropTableIfExists('users')
    await connection.client!.schema.dropTableIfExists('skills')
    await connection.client!.schema.raw('DROP TYPE IF EXISTS user_role_enum_type;')
    await connection.client!.schema.raw('DROP DOMAIN IF EXISTS contact_name CASCADE;')
    await connection.client!.schema.raw('DROP TYPE IF EXISTS user_profile CASCADE;')

    await connection.client!.schema.withSchema('search').dropViewIfExists('voters')
    await connection.client!.schema.withSchema('search').dropTableIfExists('users')
    await connection.client!.schema.raw('DROP TYPE IF EXISTS search.user_role_enum_type;')
    await connection.client!.schema.raw('DROP DOMAIN IF EXISTS search.contact_name CASCADE;')
    await connection.client!.schema.dropSchemaIfExists('search')
  }

  t.cleanup(cleanup)
  await cleanup()

  const resources: {
    tables: string[]
    types: string[]
    views: string[]
  } = {
    tables: [],
    types: [],
    views: [],
  }

  /**
   * Creating custom types and domains
   */
  await connection.client!.schema.raw(`
    CREATE TYPE user_profile AS (
    user_id INT,
    profile_picture TEXT
  );`)
  await connection.client!.schema.raw(`
    CREATE DOMAIN contact_name AS TEXT NOT NULL CHECK (value !~ '\s');
  `)
  resources.types.push('user_profile', 'contact_name')

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.createTable('users', (table) => {
    table.increments()
    table.specificType('first_name', 'contact_name')
    table.specificType('last_name', 'contact_name')
    table.string('email').unique()
    table.integer('age').notNullable()
    table.enu('role', ['admin', 'guest'], {
      useNative: true,
      enumName: 'user_role_enum_type',
    })
    table.string('password')
  })
  await connection.client!.schema.createTable('profiles', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.specificType('profile_details', 'user_profile')
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
  })
  resources.tables.push('users', 'profiles')

  /**
   * Create a partition table with additional tables using the partition.
   * More about partitions. https://rasiksuhail.medium.com/guide-to-postgresql-table-partitioning-c0814b0fbd9b
   */
  await connection.client!.raw(
    `CREATE TABLE skills (id INTEGER, name TEXT, status TEXT) PARTITION BY LIST(status);`
  )
  await connection.client!.raw(
    `CREATE TABLE skills_active PARTITION OF skills FOR VALUES IN ('ACTIVE');`
  )
  await connection.client!.raw(
    `CREATE TABLE skills_archived PARTITION OF skills FOR VALUES IN ('ARCHIVED');`
  )
  resources.tables.push('skills', 'skills_active', 'skills_archived')

  /**
   * Creating a view
   */
  await connection.client!.schema.createView('voters', (view) => {
    view.columns(['first_name', 'email'])
    view.as(
      connection.client!.from('users').select(['first_name', 'email']).where('age', '>', '18')
    )
  })
  resources.views.push('voters')

  /**
   * Search schema begins here
   */
  await connection.client!.schema.createSchema('search')
  await connection.client!.schema.raw(`
    CREATE DOMAIN search.contact_name AS TEXT NOT NULL CHECK (value !~ '\s');
  `)
  resources.types.push('search.contact_name')

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.withSchema('search').createTable('users', (table) => {
    table.increments()
    table.specificType('first_name', 'contact_name')
    table.specificType('last_name', 'contact_name')
    table.string('email').unique()
    table.integer('age').notNullable()
    table.enu('role', ['admin', 'guest'], {
      useNative: true,
      enumName: 'user_role_enum_type',
    })
  })
  resources.tables.push('search.users')

  /**
   * Creating a view
   */
  await connection.client!.schema.withSchema('search').createView('voters', (view) => {
    view.columns(['first_name', 'email'])
    view.as(
      connection
        .client!.withSchema('search')
        .from('users')
        .select(['first_name', 'email'])
        .where('age', '>', '18')
    )
  })

  resources.views.push('search.voters')
  return resources
})

/**
 * Prepares the PG database for testing the truncation behavior
 */
export const pgSetupForTruncation = test.macro(async (t, connection: Connection) => {
  async function cleanup() {
    await connection.client!.schema.dropTableIfExists('profiles')
    await connection.client!.schema.dropTableIfExists('profiles_restrict_cascade')
    await connection.client!.schema.dropTableIfExists('users')
  }

  t.cleanup(cleanup)
  await cleanup()

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.createTable('users', (table) => {
    table.increments()
    table.string('email').unique().notNullable()
    table.string('password').nullable()
  })
  await connection.client!.schema.createTable('profiles', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
  })
  await connection.client!.schema.createTable('profiles_restrict_cascade', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.integer('user_id').unsigned().references('users.id').onDelete('RESTRICT')
  })
})

/**
 * Prepares the MySQL database for testing the dialect helpers that are used
 * to scan the database for precise info. Here we create tables and views.
 */
export const mySQLSetupForScanning = test.macro(async (t, connection: Connection) => {
  async function cleanup() {
    await connection.client!.schema.dropViewIfExists('voters')
    await connection.client!.schema.dropTableIfExists('profiles')
    await connection.client!.schema.dropTableIfExists('users')
    await connection.client!.schema.dropTableIfExists('skills')
  }

  t.cleanup(cleanup)
  await cleanup()

  const resources: {
    tables: string[]
    views: string[]
  } = {
    tables: [],
    views: [],
  }

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.createTable('users', (table) => {
    table.increments()
    table.string('first_name')
    table.string('last_name')
    table.string('email').unique()
    table.integer('age').notNullable()
    table.enu('role', ['admin', 'guest'])
    table.string('password')
  })
  await connection.client!.schema.createTable('profiles', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
  })
  resources.tables.push('users', 'profiles')

  /**
   * Create a partition table with additional tables using the partition.
   * More about partitions. https://planetscale.com/blog/what-is-mysql-partitioning
   */
  await connection.client!.raw(
    `CREATE TABLE skills (id INT, name VARCHAR(255), status VARCHAR(255)) PARTITION BY LIST COLUMNS(status) (
      PARTITION skills_active VALUES IN ('ACTIVE'),
      PARTITION skills_archived VALUES IN ('ARCHIVED')
    );`
  )
  resources.tables.push('skills')

  /**
   * Creating a view
   */
  await connection.client!.schema.createView('voters', (view) => {
    view.columns(['first_name', 'email'])
    view.as(
      connection.client!.from('users').select(['first_name', 'email']).where('age', '>', '18')
    )
  })
  resources.views.push('voters')
  return resources
})

/**
 * Prepares the SQLite database for testing the dialect helpers that are used
 * to scan the database for precise info. Here we create tables and views.
 */
export const SQLiteSetupForScanning = test.macro(async (t, connection: Connection) => {
  async function cleanup() {
    await connection.client!.schema.dropViewIfExists('voters')
    await connection.client!.schema.dropTableIfExists('profiles')
    await connection.client!.schema.dropTableIfExists('users')
    await connection.client!.schema.dropTableIfExists('skills')
  }

  t.cleanup(cleanup)
  await cleanup()

  const resources: {
    tables: string[]
    views: string[]
  } = {
    tables: [],
    views: [],
  }

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.createTable('users', (table) => {
    table.increments()
    table.string('first_name')
    table.string('last_name')
    table.string('email').unique()
    table.integer('age').notNullable()
    table.enu('role', ['admin', 'guest'])
    table.string('password')
  })
  await connection.client!.schema.createTable('profiles', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
  })
  resources.tables.push('users', 'profiles')

  /**
   * Creating a view
   */
  await connection.client!.schema.createView('voters', (view) => {
    view.columns(['first_name', 'email'])
    view.as(
      connection.client!.from('users').select(['first_name', 'email']).where('age', '>', '18')
    )
  })
  resources.views.push('voters')
  return resources
})

/**
 * Prepares the MSSQL database for testing the dialect helpers that are used
 * to scan the database for precise info. Here we create:
 *
 * - Tables
 * - Custom types
 * - Views
 */
export const MSSQLSetupForScanning = test.macro(async (t, connection: Connection) => {
  async function cleanup() {
    await connection.client!.schema.dropViewIfExists('voters')
    await connection.client!.schema.dropTableIfExists('profiles')
    await connection.client!.schema.dropTableIfExists('users')
    await connection.client!.schema.dropTableIfExists('comments')
    await connection.client!.schema.dropTableIfExists('posts')

    await connection.client!.schema.withSchema('search').dropViewIfExists('voters')
    await connection.client!.schema.withSchema('search').dropTableIfExists('users')
    await connection.client!.schema.raw('DROP SCHEMA IF EXISTS search;')
  }

  t.cleanup(cleanup)
  await cleanup()

  const resources: {
    tables: string[]
    views: string[]
  } = {
    tables: [],
    views: [],
  }

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.createTable('users', (table) => {
    table.increments()
    table.string('first_name')
    table.string('last_name')
    table.string('email').unique()
    table.integer('age').notNullable()
    table.specificType(
      'role',
      `nvarchar(100) check ([role] in ('${['admin', 'guest'].join("', '")}'))`
    )
    table.string('password')
  })
  await connection.client!.schema.createTable('profiles', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
  })
  await connection.client!.schema.createTable('posts', (table) => {
    table.increments()
    table.string('title').nullable()
    table.string('description').nullable()
  })
  await connection.client!.schema.createTable('comments', (table) => {
    table.increments()
    table.integer('post_id').unsigned().references('posts.id').onDelete('CASCADE')
    table.string('body').nullable()
  })
  resources.tables.push('users', 'profiles', 'posts', 'comments')

  /**
   * Creating a view
   */
  await connection.client!.schema.createView('voters', (view) => {
    view.columns(['first_name', 'email'])
    view.as(
      connection.client!.from('users').select(['first_name', 'email']).where('age', '>', '18')
    )
  })
  resources.views.push('voters')

  /**
   * Search schema begins here
   */
  await connection.client!.schema.raw('CREATE SCHEMA search;')

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.withSchema('search').createTable('users', (table) => {
    table.increments()
    table.string('first_name')
    table.string('last_name')
    table.string('email').unique()
    table.integer('age').notNullable()
    table.specificType(
      'role',
      `nvarchar(100) check ([role] in ('${['admin', 'guest'].join("', '")}'))`
    )
  })
  resources.tables.push('search.users')

  /**
   * Creating a view
   */
  await connection.client!.schema.withSchema('search').createView('voters', (view) => {
    view.columns(['first_name', 'email'])
    view.as(
      connection
        .client!.withSchema('search')
        .from('users')
        .select(['first_name', 'email'])
        .where('age', '>', '18')
    )
  })

  resources.views.push('search.voters')
  return resources
})

/**
 * Prepares the MySQL database for testing the truncation behavior
 */
export const mySQLSetupForTruncation = pgSetupForTruncation

/**
 * Prepares the SQLite database for testing the truncation behavior
 */
export const SQLiteSetupForTruncation = pgSetupForTruncation

/**
 * Prepares the MSSL database for testing the truncation behavior
 */
export const MSSQLSetupForTruncation = test.macro(async (t, connection: Connection) => {
  async function cleanup() {
    await connection.client!.schema.dropTableIfExists('profiles')
    await connection.client!.schema.dropTableIfExists('profiles_restrict_cascade')
    await connection.client!.schema.dropTableIfExists('users')
  }

  t.cleanup(cleanup)
  await cleanup()

  /**
   * Creating neccessary tables
   */
  await connection.client!.schema.createTable('users', (table) => {
    table.increments()
    table.string('email').unique().notNullable()
    table.string('password').nullable()
  })
  await connection.client!.schema.createTable('profiles', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')
  })
  await connection.client!.schema.createTable('profiles_restrict_cascade', (table) => {
    table.increments()
    table.string('full_name').nullable()
    table.integer('user_id').unsigned().references('users.id').onDelete('NO ACTION')
  })
})
