/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Connection } from '../../src/connection.js'
import { PgDialect } from '../../src/dialects/pg_dialect.js'
import { PGConfigOptions } from '../../src/types/connection.js'
import { getConnectionConfig, pgSetupForScanning, pgSetupForTruncation } from '../helpers.js'

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
