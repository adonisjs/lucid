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
import { getConfig, setup, cleanup, getLogger, getProfiler, getDb } from '../../test-helpers'

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
    const result = await db.rawQuery('select 1 + 1')
    assert.isDefined(result)
    await db.manager.closeAll()
  })

  test('get raw query builder instance in read mode', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    const result = await db.rawQuery('select 1 + 1', [], { mode: 'read' })
    assert.isDefined(result)
    await db.manager.closeAll()
  })

  test('get raw query builder instance in write mode', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    const result = await db.rawQuery('select 1 + 1', [], { mode: 'write' })
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

test.group('Database | extend', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('extend database query builder by adding macros', async (assert) => {
    const db = getDb()

    db.DatabaseQueryBuilder.macro('whereActive', function whereActive () {
      this.where('is_active', true)
      return this
    })

    const knexClient = db.connection().getReadClient()

    const { sql, bindings } = db.query().from('users')['whereActive']().toSQL()
    const { sql: knexSql, bindings: knexBindings } = knexClient
      .from('users')
      .where('is_active', true)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await db.manager.closeAll()
  })

  test('extend insert query builder by adding macros', async (assert) => {
    const db = getDb()

    db.InsertQueryBuilder.macro('returnId', function whereActive () {
      this.returning('id')
      return this
    })

    const knexClient = db.connection().getReadClient()

    const { sql, bindings } = db
      .insertQuery()
      .table('users')['returnId']()
      .insert({ id: 1 })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = knexClient
      .from('users')
      .returning('id')
      .insert({ id: 1 })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await db.manager.closeAll()
  })
})

test.group('Database | global transaction', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('perform queries inside a global transaction', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
    await db.beginGlobalTransaction()

    await db.table('users').insert({ username: 'virk' })
    await db.rollbackGlobalTransaction()

    const users = await db.from('users')
    assert.lengthOf(users, 0)
    assert.equal(db.connectionGlobalTransactions.size, 0)

    await db.manager.closeAll()
  })

  test('create transactions inside a global transaction', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
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

  test('multiple calls to beginGlobalTransaction must be a noop', async (assert) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, getLogger(), getProfiler())
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
