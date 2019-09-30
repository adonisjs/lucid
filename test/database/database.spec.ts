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

import { Database } from '../../src/Database'
import { getConfig, setup, cleanup, getLogger, getProfiler } from '../../test-helpers'

test.group('Database', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('register all connections with the manager', (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())

    assert.isDefined(db.manager.connections.get('primary'))
    assert.equal(db.manager.connections.get('primary')!.state, 'registered')
    assert.isUndefined(db.manager.connections.get('primary')!.connection)
  })

  test('make connection when db.connection is called', async (assert) => {
    assert.plan(1)

    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    db.manager.on('connect', (connection) => {
      assert.equal(connection.name, 'primary')
    })

    db.connection()
    await db.manager.closeAll()
  })

  test('make connection to a named connection', async (assert) => {
    assert.plan(1)

    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    db.manager.on('connect', (connection) => {
      assert.equal(connection.name, 'primary')
    })

    db.connection('primary')
    await db.manager.closeAll()
  })

  test('make connection to a named connection in write mode', async (assert) => {
    assert.plan(1)

    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    const client = db.connection('primary', { mode: 'write' })

    assert.equal(client.mode, 'write')
    await db.manager.closeAll()
  })

  test('make connection to a named connection in read mode', async (assert) => {
    assert.plan(1)

    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    const client = db.connection('primary', { mode: 'read' })

    assert.equal(client.mode, 'read')
    await db.manager.closeAll()
  })

  test('get transaction instance', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    const trx = await db.transaction()

    assert.equal(trx.mode, 'dual')
    assert.isTrue(trx.isTransaction)

    await trx.rollback()
    await db.manager.closeAll()
  })

  test('get raw query builder instance', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    const result = await db.raw('select 1 + 1')
    assert.isDefined(result)
    await db.manager.closeAll()
  })

  test('get raw query builder instance in read mode', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    const result = await db.raw('select 1 + 1', [], { mode: 'read' })
    assert.isDefined(result)
    await db.manager.closeAll()
  })

  test('get raw query builder instance in write mode', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    const result = await db.raw('select 1 + 1', [], { mode: 'write' })
    assert.isDefined(result)
    await db.manager.closeAll()
  })

  test('pass profiler to query client', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const profiler = getProfiler()
    const db = new Database(config, getLogger(), profiler)
    const client = db.connection('primary')
    assert.deepEqual(client.profiler, profiler)

    await db.manager.closeAll()
  })

  test('pass custom profiler to query client', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const profiler = getProfiler()
    const row = profiler.create('scoped')

    const db = new Database(config, getLogger(), profiler)
    const client = db.connection('primary', { profiler: row })
    assert.deepEqual(client.profiler, row)

    await db.manager.closeAll()
  })

  test('forward profiler to transaction client', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const profiler = getProfiler()

    const db = new Database(config, getLogger(), profiler)
    const client = db.connection('primary')
    const trx = await client.transaction()
    assert.equal(trx.profiler, profiler)

    await trx.rollback()
    await db.manager.closeAll()
  })

  test('forward profiler to nested transaction client', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const profiler = getProfiler()

    const db = new Database(config, getLogger(), profiler)
    const client = db.connection('primary')
    const trx = await client.transaction()
    const trx1 = await trx.transaction()

    assert.equal(trx.profiler, profiler)
    assert.equal(trx1.profiler, profiler)

    await trx1.rollback()
    await trx.rollback()
    await db.manager.closeAll()
  })
})
