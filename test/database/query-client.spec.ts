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
import { getConfig, setup, cleanup, getLogger, resetTables } from '../../test-helpers'

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

    const client = new QueryClient('dual', connection)
    assert.equal(client.mode, 'dual')
    await connection.disconnect()
  })

  test('get query client in read only mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('read', connection)
    assert.equal(client.mode, 'read')
    await connection.disconnect()
  })

  test('get query client in write only mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('write', connection)
    assert.equal(client.mode, 'write')
    await connection.disconnect()
  })

  test('get columns info', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const client = new QueryClient('write', connection)
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

    const client = new QueryClient('write', connection)
    const column = await client.columnsInfo('users', 'id')
    assert.deepEqual(column, {
      type: 'integer',
      maxLength: null,
      nullable: false,
      defaultValue: null,
    })
  })
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
    const client = new QueryClient('dual', connection)

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform insert queries in dual mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('dual', connection)

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
    const client = new QueryClient('dual', connection)

    const command = process.env.DB === 'sqlite' ? 'DELETE FROM users;' : 'TRUNCATE users;'

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
    const client = new QueryClient('dual', connection)

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
    const client = new QueryClient('read', connection)

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('raise error when attempting to perform insert in read mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('read', connection)

    const fn = () => client.insertQuery()
    assert.throw(fn, 'Write client is not available for query client instantiated in read mode')

    await connection.disconnect()
  })

  test('perform raw queries in read mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('read', connection)

    const result = await client.rawQuery('SELECT 1 + 1').exec()
    assert.isDefined(result)

    await connection.disconnect()
  })

  test('raise error when attempting to get transaction in read mode', async (assert) => {
    assert.plan(1)

    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('read', connection)

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
    const client = new QueryClient('write', connection)

    const results = await client.query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform insert queries in write mode', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const client = new QueryClient('write', connection)

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
    const client = new QueryClient('write', connection)

    const command = process.env.DB === 'sqlite' ? 'DELETE FROM users;' : 'TRUNCATE users;'

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
    const client = new QueryClient('write', connection)

    const trx = await client.transaction()
    await trx.insertQuery().table('users').insert({ username: 'virk' })
    await trx.rollback()

    const results = await client.query().from('users')

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })
})

if (process.env.DB !== 'sqlite') {
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

      const client = new QueryClient('dual', connection)
      const lock = await client.dialect.getAdvisoryLock(1)

      assert.isTrue(lock)
      assert.equal(client.dialect.name, resolveClientNameWithAliases(connection.config.client))

      await client.dialect.releaseAdvisoryLock(1)
      await connection.disconnect()
    })

    test('release advisory lock', async (assert) => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = new QueryClient('dual', connection)
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
