/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { Connection } from '../../src/connection/index.js'
import { QueryClient } from '../../src/query_client/index.js'
import {
  logger,
  setup,
  cleanup,
  getConfig,
  resetTables,
  createEmitter,
} from '../../test-helpers/index.js'

test.group('Query client', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get query client in dual mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = new QueryClient('dual', connection, createEmitter())
    assert.equal(client.mode, 'dual')
    await connection.disconnect()
  })

  test('get query client in read only mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = new QueryClient('read', connection, createEmitter())
    assert.equal(client.mode, 'read')
    await connection.disconnect()
  })

  test('get query client in write only mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = new QueryClient('write', connection, createEmitter())
    assert.equal(client.mode, 'write')
    await connection.disconnect()
  })

  /**
   * We cannot rely on knexjs for this and have to write our own code
   */
  test('get query client dialect version', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = new QueryClient('write', connection, createEmitter())
    await client.rawQuery('SELECT 1 + 1 AS result')

    const client1 = new QueryClient('write', connection, createEmitter())
    assert.exists(client1.dialect.version)

    await connection.disconnect()
  }).skip(true)

  test('get columns info', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = new QueryClient('write', connection, createEmitter())
    const columns = await client.columnsInfo('users')
    assert.property(columns, 'id')
    assert.property(columns, 'country_id')
    assert.property(columns, 'username')
    assert.property(columns, 'email')
    assert.property(columns, 'points')
    assert.property(columns, 'joined_at')
    assert.property(columns, 'created_at')
    assert.property(columns, 'updated_at')

    await connection.disconnect()
  })

  test('get single column info', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = new QueryClient('write', connection, createEmitter())
    const column = await client.columnsInfo('users', 'id')
    assert.oneOf(column.type, ['integer', 'int'])

    await connection.disconnect()
  })

  if (process.env.DB !== 'mssql') {
    test('truncate table with cascade', async () => {
      const connection = new Connection('primary', getConfig(), logger)
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
      const client = new QueryClient('write', connection, createEmitter())
      await client.truncate('test_users', true)

      /**
       * Drop tables
       */
      await connection.client?.schema.dropTable('test_profiles')
      await connection.client?.schema.dropTable('test_users')

      await connection.disconnect()
    })
  }

  test('truncate a table with reserved keywork', async () => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    await connection.client?.schema.createTableIfNotExists('user', (table) => {
      table.increments('id').primary()
      table.string('username')
    })

    const client = new QueryClient('write', connection, createEmitter())
    await client.truncate('user', true)

    await connection.client?.schema.dropTable('user')
    await connection.disconnect()
  })
})

test.group('Query client | dual mode', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('perform select queries in dual mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('dual', connection, createEmitter())

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform insert queries in dual mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('dual', connection, createEmitter())

    await client.insertQuery().table('users').insert({ username: 'virk' })
    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('perform raw queries in dual mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('dual', connection, createEmitter())

    const command = ['better_sqlite', 'sqlite', 'libsql'].includes(process.env.DB!)
      ? 'DELETE FROM users;'
      : process.env.DB === 'mssql'
        ? 'TRUNCATE table users;'
        : 'TRUNCATE users;'

    await client.insertQuery().table('users').insert({ username: 'virk' })
    await client.rawQuery(command).exec()
    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform queries inside a transaction in dual mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('dual', connection, createEmitter())

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
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('perform select queries in read mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('read', connection, createEmitter())

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('raise error when attempting to perform insert in read mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('read', connection, createEmitter())

    const fn = () => client.insertQuery()
    assert.throws(fn, 'Write client is not available for query client instantiated in read mode')

    await connection.disconnect()
  })

  test('perform raw queries in read mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('read', connection, createEmitter())

    const result = await client.rawQuery('SELECT 1 + 1').exec()
    assert.isDefined(result)

    await connection.disconnect()
  })

  test('raise error when attempting to get transaction in read mode', async ({ assert }) => {
    assert.plan(1)

    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('read', connection, createEmitter())

    try {
      await client.transaction()
    } catch ({ message }) {
      assert.equal(
        message,
        'Write client is not available for query client instantiated in read mode'
      )
    }

    await connection.disconnect()
  })
})

test.group('Query client | write mode', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('perform select queries in write mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('write', connection, createEmitter())

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform insert queries in write mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('write', connection, createEmitter())

    await client.insertQuery().table('users').insert({ username: 'virk' })
    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('perform raw queries in write mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('write', connection, createEmitter())

    const command = ['better_sqlite', 'sqlite', 'libsql'].includes(process.env.DB!)
      ? 'DELETE FROM users;'
      : process.env.DB === 'mssql'
        ? 'TRUNCATE table users;'
        : 'TRUNCATE users;'

    await client.insertQuery().table('users').insert({ username: 'virk' })
    await client.rawQuery(command).exec()
    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform queries inside a transaction in write mode', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const client = new QueryClient('write', connection, createEmitter())

    const trx = await client.transaction()
    await trx.insertQuery().table('users').insert({ username: 'virk' })
    await trx.rollback()

    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })
})

if (!['sqlite', 'mssql', 'better_sqlite', 'libsql'].includes(process.env.DB!)) {
  test.group('Query client | advisory locks', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('get advisory lock', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = new QueryClient('dual', connection, createEmitter())
      const lock = await client.dialect.getAdvisoryLock(1)
      assert.isTrue(lock)

      await client.dialect.releaseAdvisoryLock(1)
      await connection.disconnect()
    })

    test('release advisory lock', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = new QueryClient('dual', connection, createEmitter())
      await client.dialect.getAdvisoryLock(1)
      const released = await client.dialect.releaseAdvisoryLock(1)
      assert.isTrue(released)

      await connection.disconnect()
    })
  })
}

test.group('Query client | get tables', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get an array of tables', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = new QueryClient('dual', connection, createEmitter())
    const tables = await client.getAllTables(['public'])
    if (process.env.DB !== 'mysql_legacy') {
      assert.deepEqual(tables, [
        'comments',
        'countries',
        'follows',
        'friends',
        'group_user',
        'groups',
        'identities',
        'posts',
        'profiles',
        'skill_user',
        'skills',
        'users',
        'uuid_users',
      ])
    } else {
      assert.deepEqual(tables, [
        'comments',
        'countries',
        'follows',
        'friends',
        'groups',
        'group_user',
        'identities',
        'posts',
        'profiles',
        'skills',
        'skill_user',
        'users',
        'uuid_users',
      ])
    }

    await connection.disconnect()
  })
})
