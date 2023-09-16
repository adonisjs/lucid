/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { Database } from '../../src/database/index.js'
import { getConfig, setup, cleanup, logger, createEmitter } from '../../test-helpers/index.js'

test.group('Database', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('register all connections with the manager', ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())

    assert.isDefined(db.manager.connections.get('primary'))
    assert.equal(db.manager.connections.get('primary')!.state, 'registered')
    assert.isUndefined(db.manager.connections.get('primary')!.connection)
  })

  test('make connection when db.connection is called', async ({ assert }, done) => {
    assert.plan(1)

    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const emitter = createEmitter()
    const db = new Database(config, logger, emitter)
    emitter.on('db:connection:connect', (connection) => {
      assert.equal(connection.name, 'primary')
      done()
    })

    db.connection()
    await db.manager.closeAll()
  }).waitForDone()

  test('make connection to a named connection', async ({ assert }, done) => {
    assert.plan(1)

    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const emitter = createEmitter()
    const db = new Database(config, logger, emitter)
    emitter.on('db:connection:connect', (connection) => {
      assert.equal(connection.name, 'primary')
      done()
    })

    db.connection('primary')
    await db.manager.closeAll()
  }).waitForDone()

  test('make connection to a named connection in write mode', async ({ assert }) => {
    assert.plan(1)

    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const client = db.connection('primary', { mode: 'write' })

    assert.equal(client.mode, 'write')
    await db.manager.closeAll()
  })

  test('make connection to a named connection in read mode', async ({ assert }) => {
    assert.plan(1)

    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const client = db.connection('primary', { mode: 'read' })

    assert.equal(client.mode, 'read')
    await db.manager.closeAll()
  })

  test('get transaction instance', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const trx = await db.transaction()

    assert.equal(trx.mode, 'dual')
    assert.isTrue(trx.isTransaction)

    await trx.rollback()
    await db.manager.closeAll()
  })

  test('get raw query builder instance', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const result = await db.rawQuery('select 1 + 1')
    assert.isDefined(result)
    await db.manager.closeAll()
  })

  test('get raw query builder instance in read mode', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const result = await db.rawQuery('select 1 + 1', [], { mode: 'read' })
    assert.isDefined(result)
    await db.manager.closeAll()
  })

  test('get raw query builder instance in write mode', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const result = await db.rawQuery('select 1 + 1', [], { mode: 'write' })
    assert.isDefined(result)
    await db.manager.closeAll()
  })

  test('set hasHealthChecks enabled flag to true, when one ore more connections are using health checks', async ({
    assert,
  }) => {
    const config = {
      connection: 'primary',
      connections: { primary: Object.assign({}, getConfig(), { healthCheck: true }) },
    }

    const db = new Database(config, logger, createEmitter())
    assert.isTrue(db.hasHealthChecksEnabled)
    await db.manager.closeAll()
  })
})

test.group('Database | global transaction', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('perform queries inside a global transaction', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    await db.beginGlobalTransaction()

    await db.table('users').insert({ username: 'virk' })
    await db.rollbackGlobalTransaction()

    const users = await db.from('users')
    assert.lengthOf(users, 0)
    assert.equal(db.connectionGlobalTransactions.size, 0)

    await db.manager.closeAll()
  })

  test('create transactions inside a global transaction', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    await db.beginGlobalTransaction()
    const trx = await db.transaction()

    await trx.table('users').insert({ username: 'virk' })
    await trx.commit()

    await db.rollbackGlobalTransaction()

    const users = await db.from('users')
    assert.lengthOf(users, 0)
    assert.equal(db.connectionGlobalTransactions.size, 0)

    await db.manager.closeAll()
  })

  test('multiple calls to beginGlobalTransaction must be a noop', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    await db.beginGlobalTransaction()
    await db.beginGlobalTransaction()
    await db.beginGlobalTransaction()

    await db.table('users').insert({ username: 'virk' })

    await db.rollbackGlobalTransaction()

    const users = await db.from('users')
    assert.lengthOf(users, 0)
    assert.equal(db.connectionGlobalTransactions.size, 0)

    await db.manager.closeAll()
  })
})
