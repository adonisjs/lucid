/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../../src/debug.js'
import { PgDialect } from '../../src/dialects/pg_dialect.js'
import { Connection } from '../../src/connection/connection.js'
import { PGConfigOptions } from '../../src/types/connection.js'
import {
  dbSetup,
  getConnectionConfig,
  pgSetupForScanning,
  pgSetupForTruncation,
} from '../helpers.js'
import { QueryClient } from '../../src/database_clients/query_client.js'
import { SelectExpressionBuilder } from '../../src/expression_builders/select_expression_builder.js'

test.group('PG Dialect | getAllTables', () => {
  test('get tables for all the schemas including partitions', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)
    assert.sameDeepMembers(await dialect.getAllTables(), [
      {
        schema: 'public',
        name: 'users',
      },
      {
        schema: 'public',
        name: 'skills',
      },
      {
        schema: 'public',
        name: 'skills_active',
      },
      {
        schema: 'public',
        name: 'skills_archived',
      },
      {
        schema: 'public',
        name: 'profiles',
      },
      {
        schema: 'search',
        name: 'users',
      },
    ])
  })

  test('get all tables for a given schema', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)
    assert.sameDeepMembers(await dialect.getAllTables(['search']), [
      {
        schema: 'search',
        name: 'users',
      },
    ])
  })
})

test.group('PG Dialect | getAllTypes', () => {
  test('get types for all the schemas', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)
    assert.sameDeepMembers(await dialect.getAllTypes(), [
      {
        category: 'C',
        schema: 'public',
        type: 'c',
        name: 'user_profile',
      },
      {
        category: 'E',
        schema: 'public',
        type: 'e',
        name: 'user_role_enum_type',
      },
      {
        category: 'S',
        schema: 'public',
        type: 'd',
        name: 'contact_name',
      },
      {
        category: 'E',
        schema: 'search',
        type: 'e',
        name: 'user_role_enum_type',
      },
      {
        category: 'S',
        schema: 'search',
        type: 'd',
        name: 'contact_name',
      },
    ])
  })

  test('get types for a given schema', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)
    assert.sameDeepMembers(await dialect.getAllTypes(['search']), [
      {
        category: 'E',
        schema: 'search',
        type: 'e',
        name: 'user_role_enum_type',
      },
      {
        category: 'S',
        schema: 'search',
        type: 'd',
        name: 'contact_name',
      },
    ])
  })
})

test.group('PG Dialect | getAllViews', () => {
  test('get views for all the schemas', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)
    assert.snapshot(await dialect.getAllViews()).matchInline(`
      [
        {
          "definition": " SELECT first_name,
          email
         FROM users
        WHERE (age > 18);",
          "name": "voters",
          "schema": "public",
        },
        {
          "definition": " SELECT first_name,
          email
         FROM search.users
        WHERE (age > 18);",
          "name": "voters",
          "schema": "search",
        },
      ]
    `)
  })

  test('get views for a given schemas', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)
    assert.snapshot(await dialect.getAllViews(['search'])).matchInline(`
      [
        {
          "definition": " SELECT first_name,
          email
         FROM search.users
        WHERE (age > 18);",
          "name": "voters",
          "schema": "search",
        },
      ]
    `)
  })
})

test.group('PG Dialect | dropAllTables', () => {
  test('drop all tables from the default schema', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)

    const rows = await connection
      .getWriteClient()
      .table('users')
      .insert({
        first_name: 'foo',
        last_name: 'bar',
        email: 'foo@bar.com',
        password: 'secret',
        age: 32,
      })
      .returning('id')

    await connection.getWriteClient().table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })

    /**
     * All tables exists
     */
    for (let table of resources.tables) {
      assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
    }

    /**
     * All tables dropped
     */
    await dialect.dropAllTables()
    for (let table of resources.tables) {
      if (table.includes('search.')) {
        assert.isTrue(await dialect.hasTable(table), `"${table}" table exist`)
      } else {
        assert.isFalse(await dialect.hasTable(table), `"${table}" table does not exist`)
      }
    }
  })

  test('drop all tables from globally configured search path', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')

    /**
     * Updating the searchPath to include public and search and expecting
     * the dropAllTables to consider this searchPath
     */
    ;(config as PGConfigOptions).searchPath = ['public', 'search']

    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)

    /**
     * All tables exists
     */
    for (let table of resources.tables) {
      assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
    }

    /**
     * All tables dropped
     */
    await dialect.dropAllTables()
    for (let table of resources.tables) {
      assert.isFalse(await dialect.hasTable(table), `"${table}" table does not exist`)
    }
  })

  test('drop all tables excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)

    /**
     * All tables exists
     */
    for (let table of resources.tables) {
      assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
    }

    /**
     * All tables dropped except the excluded one's.
     */
    await dialect.dropAllTables(['search.voters', 'users'])

    for (let table of resources.tables) {
      if (['users', 'search.users', 'search.voters'].includes(table)) {
        assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
      } else {
        assert.isFalse(await dialect.hasTable(table), `"${table}" does not table exist`)
      }
    }
  })

  test('drop all tables from an explicit searchPath', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')

    /**
     * Updating the searchPath to include public and search and expecting
     * the dropAllTables to consider the explicit searchPath over this
     */
    ;(config as PGConfigOptions).searchPath = ['public', 'search']
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)

    /**
     * All tables exists
     */
    for (let table of resources.tables) {
      assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
    }

    /**
     * All tables dropped from the public schema
     */
    await dialect.dropAllTables([], ['public'])

    for (let table of resources.tables) {
      if (table.startsWith('search.')) {
        assert.isTrue(await dialect.hasTable(table), `"${table}" table exists`)
      } else {
        assert.isFalse(await dialect.hasTable(table, ['public']), `"${table}" table does not exist`)
      }
    }

    /**
     * All tables dropped from the search schema
     */
    await dialect.dropAllTables([], ['search'])

    for (let table of resources.tables) {
      assert.isFalse(await dialect.hasTable(table), `"${table}" table does not exist`)
    }
  })
})

test.group('PG Dialect | dropAllViews', () => {
  test('drop all views from the default schema', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)

    /**
     * All views exists
     */
    for (let view of resources.views) {
      assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
    }

    /**
     * All views dropped
     */
    await dialect.dropAllViews()
    for (let view of resources.views) {
      if (view.includes('search.')) {
        assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
      } else {
        assert.isFalse(await dialect.hasView(view), `"${view}" view does not exist`)
      }
    }
  })

  test('drop all views from globally configured search path', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    /**
     * Updating the searchPath to include public and search and expecting
     * the dropAllViews to consider this searchPath
     */
    ;(config as PGConfigOptions).searchPath = ['public', 'search']

    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)

    /**
     * All views exists
     */
    for (let view of resources.views) {
      assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
    }

    /**
     * All views dropped
     */
    await dialect.dropAllViews()
    for (let view of resources.views) {
      assert.isFalse(await dialect.hasView(view), `"${view}" view does not exist`)
    }
  })

  test('drop all views excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)

    /**
     * All views exists
     */
    for (let view of resources.views) {
      assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
    }

    /**
     * All views dropped
     */
    await dialect.dropAllViews(['public.voters'], ['public', 'search'])
    for (let view of resources.views) {
      if (view === 'voters') {
        assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
      } else {
        assert.isFalse(await dialect.hasView(view), `"${view}" view does not exist`)
      }
    }
  })

  test('drop all views from an explicit searchPath', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')

    /**
     * Updating the searchPath to include public and search and expecting
     * the dropAllViews to consider the explicit searchPath over this
     */
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const resources = await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)

    /**
     * All views exists
     */
    for (let view of resources.views) {
      assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
    }

    /**
     * All views dropped from the public schema
     */
    await dialect.dropAllViews([], ['public'])
    for (let view of resources.views) {
      if (view.startsWith('search.')) {
        assert.isTrue(await dialect.hasView(view), `"${view}" view exists`)
      } else {
        assert.isFalse(await dialect.hasView(view, ['public']), `"${view}" view does not exist`)
      }
    }
  })
})

test.group('PG Dialect | truncateAllTables', () => {
  test('truncate all tables with foreign key constraints', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const knex = connection.getWriteClient()
    cleanup(() => connection.close())

    await pgSetupForTruncation(connection)
    const dialect = new PgDialect(connection)

    const rows = await knex
      .table('users')
      .insert({
        email: 'foo@bar.com',
        password: 'secret',
      })
      .returning('id')
    await knex.table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })
    await knex.table('profiles_restrict_cascade').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })

    await dialect.truncateAllTables()
    assert.deepEqual(await knex.from('users').select('*'), [])
    assert.deepEqual(await knex.from('profiles').select('*'), [])
    assert.deepEqual(await knex.from('profiles_restrict_cascade').select('*'), [])
  })

  test('truncate all tables excluding the provided list', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const knex = connection.getWriteClient()
    cleanup(() => connection.close())

    await pgSetupForTruncation(connection)
    const dialect = new PgDialect(connection)

    const rows = await knex
      .table('users')
      .insert({
        email: 'foo@bar.com',
        password: 'secret',
      })
      .returning('id')
    await knex.table('profiles').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })
    await knex.table('profiles_restrict_cascade').insert({
      full_name: 'foo bar',
      user_id: rows[0].id,
    })

    await dialect.truncateAllTables(['users'])
    assert.lengthOf(await knex.from('users').select('*'), 1)
    assert.deepEqual(await knex.from('profiles_restrict_cascade').select('*'), [])
    assert.deepEqual(await knex.from('profiles').select('*'), [])
  })
})

test.group('PG Dialect | acquireAdvisoryLock', () => {
  test('acquire advisory lock for a key', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    const dialect = new PgDialect(connection)
    cleanup(async () => {
      await dialect.releaseAdvisoryLock('migrations')
    })

    assert.isTrue(await dialect.getAdvisoryLock('migrations'))
  })

  test('fail to acquire lock when already taken', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const connection1 = new Connection('secondary', config)
    cleanup(() => connection.close())
    cleanup(() => connection1.close())

    const dialect = new PgDialect(connection)
    const dialect1 = new PgDialect(connection1)
    cleanup(async () => {
      await dialect.releaseAdvisoryLock('migrations')
    })

    assert.isTrue(await dialect.getAdvisoryLock('migrations'))
    assert.isFalse(await dialect1.getAdvisoryLock('migrations'))
  })
})

test.group('PG Dialect | getAllColumns', () => {
  test('get columns for a table', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    cleanup(() => connection.close())

    await pgSetupForScanning(connection)
    const dialect = new PgDialect(connection)
    assert.sameDeepMembers(await dialect.getAllColumns('public.users'), [
      {
        name: 'id',
        type: 'number',
        dialectType: 'integer',
        nullable: false,
        optional: false,
      },
      {
        name: 'first_name',
        type: 'string',
        dialectType: 'contact_name',
        nullable: false,
        optional: false,
      },
      {
        name: 'last_name',
        type: 'string',
        dialectType: 'contact_name',
        nullable: false,
        optional: false,
      },
      {
        name: 'email',
        type: 'string',
        dialectType: 'character varying(255)',
        nullable: true,
        optional: false,
      },
      {
        name: 'age',
        type: 'number',
        dialectType: 'integer',
        nullable: false,
        optional: false,
      },
      {
        name: 'role',
        type: 'enum',
        dialectType: 'user_role_enum_type',
        nullable: true,
        optional: false,
        enumOptions: ['admin', 'guest'],
      },
      {
        name: 'password',
        type: 'string',
        dialectType: 'character varying(255)',
        nullable: true,
        optional: false,
      },
    ])
  })
})

test.group('PG Dialect | insert', () => {
  test('insert complex values to the table', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertQuery()
      .table('roles')
      .values([
        {
          name: 'guest',
          is_default: true,
        },
        {
          name: 'admin',
        },
        {
          name: 'staff',
        },
      ])
      .on('query', (sql) => debug('%O', sql))
      .exec()

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        last_name: 'Virk',
        username: 'virk@adonisjs.com', // self refs are not supported
        email: 'virk@adonisjs.com',
        age: 35,
        role_id: (q: SelectExpressionBuilder) =>
          q.from('roles').select('id').where('is_default', true),
      })
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const roles = await client.query().select('name', 'is_default', 'id').from('roles').exec()
    const users = await client.query().select('email', 'username', 'role_id').from('users').exec()

    assert.deepEqual(roles, [
      {
        id: 1,
        name: 'guest',
        is_default: true,
      },
      {
        id: 2,
        name: 'admin',
        is_default: false,
      },
      {
        id: 3,
        name: 'staff',
        is_default: false,
      },
    ])
    assert.deepEqual(users, [
      {
        email: 'virk@adonisjs.com',
        role_id: 1,
        username: 'virk@adonisjs.com',
      },
    ])
  })

  test('merge changes on unique constraint conflict', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        last_name: 'Virk',
        username: 'virk@adonisjs.com',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .on('query', (sql) => debug('%O', sql))
      .exec()

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        username: 'virk',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .on('query', (sql) => debug('%O', sql))
      .onConflict(['email'])
      .merge()
      .exec()

    const users = await client.query().select('email', 'username', 'last_name').from('users').exec()
    assert.deepEqual(users, [
      {
        email: 'virk@adonisjs.com',
        last_name: 'Virk',
        username: 'virk',
      },
    ])
  })

  test('merge selected columns', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        last_name: 'Virk',
        username: 'virk@adonisjs.com',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .on('query', (sql) => debug('%O', sql))
      .exec()

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Aman',
        last_name: 'Virk',
        username: 'virk',
        email: 'virk@adonisjs.com',
        age: 36,
      })
      .onConflict(['email'])
      .merge(['age'])
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const users = await client.query().select('first_name', 'username', 'age').from('users').exec()
    assert.deepEqual(users, [
      {
        first_name: 'Harminder',
        username: 'virk@adonisjs.com',
        age: 36,
      },
    ])
  })

  test('ignore error on unique constraint conflict', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        last_name: 'Virk',
        username: 'virk@adonisjs.com',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .on('query', (sql) => debug('%O', sql))
      .exec()

    await client
      .insertQuery()
      .table('users')
      .values({
        first_name: 'Harminder',
        username: 'virk',
        email: 'virk@adonisjs.com',
        age: 35,
      })
      .onConflict(['email'])
      .ignore()
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const users = await client.query().select('email', 'username').from('users').exec()
    assert.deepEqual(users, [
      {
        email: 'virk@adonisjs.com',
        username: 'virk@adonisjs.com',
      },
    ])
  })

  test('insert using a sub-query', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    /**
     * Create user
     */
    const [row] = await client
      .insertQuery()
      .table('users')
      .values([
        {
          first_name: 'Harminder',
          last_name: 'Virk',
          username: 'virk@adonisjs.com',
          email: 'virk@adonisjs.com',
          age: 35,
        },
      ])
      .returning(['id'])
      .on('query', (sql) => debug('%O', sql))
      .exec()

    /**
     * Create skills
     */
    await client
      .insertQuery()
      .table('skills')
      .values([
        {
          user_id: row.id,
          skill_name: 'programming',
        },
        {
          user_id: row.id,
          skill_name: 'cooking',
        },
      ])
      .on('query', (sql) => debug('%O', sql))
      .exec()

    /**
     * Replicate skills
     */
    await client
      .insertQuery()
      .table('skills')
      .columns(['skill_name', 'user_id'])
      .using((query) => {
        query.select('skill_name', 'user_id').from('skills').where('user_id', row.id)
      })
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const skills = await client.query().select('skill_name').from('skills').exec()
    assert.deepEqual(skills, [
      {
        skill_name: 'programming',
      },
      {
        skill_name: 'cooking',
      },
      {
        skill_name: 'programming',
      },
      {
        skill_name: 'cooking',
      },
    ])
  })
})

test.group('PG Dialect | update', () => {
  test('update table with complex values', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertInto('users')
      .values([
        {
          first_name: 'Harminder',
          last_name: 'Virk',
          email: 'virk@adonisjs.com',
          age: 35,
        },
        {
          first_name: 'Romain',
          last_name: 'Lanz',
          username: 'rlanz',
          email: 'rlanz@adonisjs.com',
          age: 30,
        },
      ])
      .exec()

    await client
      .updateTable('users')
      .set({
        username: client.raw('CASE WHEN ?? iS NULL THEN ?? ELSE ?? END', [
          'username',
          'email',
          'username',
        ]),
        age: client.raw('?? + ?', ['age', 1]),
      })
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const users = await client.query().select('email', 'username', 'age').from('users').exec()
    assert.deepEqual(users, [
      {
        age: 36,
        email: 'virk@adonisjs.com',
        username: 'virk@adonisjs.com',
      },
      {
        age: 31,
        email: 'rlanz@adonisjs.com',
        username: 'rlanz',
      },
    ])
  })

  test('update table as a key-value pair', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('pg')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertInto('users')
      .values([
        {
          first_name: 'Romain',
          last_name: 'Lanz',
          username: 'rlanz',
          email: 'rlanz@adonisjs.com',
          age: 30,
        },
      ])
      .exec()

    await client
      .updateTable('users')
      .set('username', client.raw('??', ['email']))
      .where('username', 'rlanz')
      .on('query', (sql) => debug('%O', sql))
      .exec()

    const users = await client.query().select('email', 'username').from('users').exec()
    assert.deepEqual(users, [
      {
        email: 'rlanz@adonisjs.com',
        username: 'rlanz@adonisjs.com',
      },
    ])
  })
})
