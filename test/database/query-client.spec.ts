/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { resolveClientNameWithAliases } from 'knex/lib/helpers'

import { Connection } from '../../src/Connection'
import { QueryClient } from '../../src/QueryClient'
import { getConfig, setup, cleanup, getLogger, resetTables, getEmitter } from '../../test-helpers'

test.group('Query client', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('get query client in dual mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('dual', connection, getEmitter())
    assert.equal(client.mode, 'dual')
    await connection.disconnect()
  })

  test('get query client in read only mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('read', connection, getEmitter())
    assert.equal(client.mode, 'read')
    await connection.disconnect()
  })

  test('get query client in write only mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('write', connection, getEmitter())
    assert.equal(client.mode, 'write')
    await connection.disconnect()
  })

  test('get columns info', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('write', connection, getEmitter())
    const columns = await client.columnsInfo('users')
    assert.deepEqual(Object.keys(columns), [
      'id',
      'country_id',
      'username',
      'email',
      'points',
      'joined_at',
      'created_at',
      'updated_at',
    ])
  })

  test('get single column info', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('write', connection, getEmitter())
    const column = await client.columnsInfo('users', 'id')
    assert.oneOf(column.type, ['integer', 'int'])
  })

  if (process.env.DB !== 'mssql') {
    test('truncate table with cascade', async () => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      /**
       * Create tables
       */
      await connection.client?.schema.createTableIfNotExists('test_users', (table) => {
        table.increments('id').primary()
        table.string('username')
      })
      await connection.client?.schema.createTableIfNotExists('test_profiles', (table) => {
        table.increments('id').primary()
        table.integer('user_id').unsigned().references('test_users.id').onDelete('CASCADE')
      })

      /**
       * Insert table
       */
      const returnValues = await connection.client?.table('test_users').insert({ username: 'virk' })
      await connection.client?.table('test_profiles').insert({ user_id: returnValues![0] })

      /**
       * Truncate
       */
      const client = new QueryClient('write', connection, getEmitter())
      await client.truncate('test_users', true)

      /**
       * Drop tables
       */
      await connection.client?.schema.dropTable('test_profiles')
      await connection.client?.schema.dropTable('test_users')
    })
  }
})

test.group('Query client | dual mode', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('perform select queries in dual mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('dual', connection, getEmitter())

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform insert queries in dual mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('dual', connection, getEmitter())

    await client.insertQuery().table('users').insert({ username: 'virk' })
    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('perform raw queries in dual mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('dual', connection, getEmitter())

    const command = process.env.DB === 'sqlite' ? 'DELETE FROM users;' : (
      process.env.DB === 'mssql' ? 'TRUNCATE table users;' : 'TRUNCATE users;'
    )

    await client.insertQuery().table('users').insert({ username: 'virk' })
    await client.rawQuery(command).exec()
    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform queries inside a transaction in dual mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('dual', connection, getEmitter())

    const trx = await client.transaction()
    await trx.insertQuery().table('users').insert({ username: 'virk' })
    await trx.rollback()

    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })
})

test.group('Query client | read mode', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('perform select queries in read mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('read', connection, getEmitter())

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('raise error when attempting to perform insert in read mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('read', connection, getEmitter())

    const fn = () => client.insertQuery()
    assert.throw(fn, 'Write client is not available for query client instantiated in read mode')

    await connection.disconnect()
  })

  test('perform raw queries in read mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('read', connection, getEmitter())

    const result = await client.rawQuery('SELECT 1 + 1').exec()
    assert.isDefined(result)

    await connection.disconnect()
  })

  test('raise error when attempting to get transaction in read mode', async (assert) => {
    assert.plan(1)

    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('read', connection, getEmitter())

    try {
      await client.transaction()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_RUNTIME_EXCEPTION: Write client is not available for query client instantiated in read mode',
      )
    }

    await connection.disconnect()
  })
})

test.group('Query client | write mode', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('perform select queries in write mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('write', connection, getEmitter())

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform insert queries in write mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('write', connection, getEmitter())

    await client.insertQuery().table('users').insert({ username: 'virk' })
    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('perform raw queries in write mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('write', connection, getEmitter())

    const command = process.env.DB === 'sqlite' ? 'DELETE FROM users;' : (
      process.env.DB === 'mssql' ? 'TRUNCATE table users;' : 'TRUNCATE users;'
    )

    await client.insertQuery().table('users').insert({ username: 'virk' })
    await client.rawQuery(command).exec()
    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform queries inside a transaction in write mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('write', connection, getEmitter())

    const trx = await client.transaction()
    await trx.insertQuery().table('users').insert({ username: 'virk' })
    await trx.rollback()

    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })
})

if (!['sqlite', 'mssql'].includes(process.env.DB as string)) {
  test.group('Query client | advisory locks', (group) => {
    group.before(async () => {
      await setup()
    })

    group.after(async () => {
      await cleanup()
    })

    group.afterEach(async () => {
      await resetTables()
    })

    test('get advisory lock', async (assert) => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = new QueryClient('dual', connection, getEmitter())
      const lock = await client.dialect.getAdvisoryLock(1)

      assert.isTrue(lock)
      assert.equal(client.dialect.name, resolveClientNameWithAliases(connection.config.client))

      await client.dialect.releaseAdvisoryLock(1)
      await connection.disconnect()
    })

    test('release advisory lock', async (assert) => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = new QueryClient('dual', connection, getEmitter())
      if (client.dialect.name === 'sqlite3') {
        await connection.disconnect()
        return
      }

      await client.dialect.getAdvisoryLock(1)
      const released = await client.dialect.releaseAdvisoryLock(1)
      assert.isTrue(released)

      await connection.disconnect()
    })
  })
}

test.group('Query client | get tables', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('get an array of tables', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('dual', connection, getEmitter())
    const tables = await client.getAllTables(['public'])
    if (process.env.DB !== 'mysql') {
      assert.deepEqual(tables, [
        'comments',
        'countries',
        'friends',
        'identities',
        'posts',
        'profiles',
        'skill_user',
        'skills',
        'users',
      ])
    } else {
      assert.deepEqual(tables, [
        'comments',
        'countries',
        'friends',
        'identities',
        'posts',
        'profiles',
        'skills',
        'skill_user',
        'users',
      ])
    }
  })
})
