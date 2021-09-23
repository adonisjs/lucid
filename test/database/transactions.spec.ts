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
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Connection } from '../../src/Connection'
import { QueryClient } from '../../src/QueryClient'
import { TransactionClient } from '../../src/TransactionClient'
import { fs, setup, cleanup, getConfig, resetTables, setupApplication } from '../../test-helpers'

let app: ApplicationContract

test.group('Transaction | query', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('perform select query under a transaction', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    ).transaction()
    const results = await db.query().from('users')
    await db.commit()

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('commit insert', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    ).transaction()
    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.commit()

    const results = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    )
      .query()
      .from('users')
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('rollback insert', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    ).transaction()
    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.rollback()

    const results = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    )
      .query()
      .from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform nested transactions with save points', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    /**
     * Transaction 1
     */
    const db = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    ).transaction()
    await db.insertQuery().table('users').insert({ username: 'virk' })

    /**
     * Transaction 2: Save point
     */
    const db1 = await db.transaction()
    await db1.insertQuery().table('users').insert({ username: 'nikk' })

    /**
     * Rollback 2
     */
    await db1.rollback()

    /**
     * Commit first
     */
    await db.commit()

    const results = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    )
      .query()
      .from('users')
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('emit after commit event', async (assert) => {
    const stack: string[] = []
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    ).transaction()

    db.on('commit', (trx) => {
      stack.push('commit')
      assert.instanceOf(trx, TransactionClient)
    })

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.commit()

    assert.deepEqual(db.listenerCount('commit'), 0)
    assert.deepEqual(db.listenerCount('rollback'), 0)
    assert.deepEqual(stack, ['commit'])

    await connection.disconnect()
  })

  test('emit after rollback event', async (assert) => {
    const stack: string[] = []
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    ).transaction()

    db.on('rollback', (trx) => {
      stack.push('rollback')
      assert.instanceOf(trx, TransactionClient)
    })

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.rollback()
    assert.deepEqual(db.listenerCount('commit'), 0)
    assert.deepEqual(db.listenerCount('rollback'), 0)
    assert.deepEqual(stack, ['rollback'])

    await connection.disconnect()
  })

  test('commit insert inside a self managed transaction', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    await new QueryClient('dual', connection, app.container.use('Adonis/Core/Event')).transaction(
      async (db) => {
        await db.insertQuery().table('users').insert({ username: 'virk' })
      }
    )

    const results = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    )
      .query()
      .from('users')
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('rollback insert inside a self managed transaction', async (assert) => {
    assert.plan(3)

    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    try {
      await new QueryClient('dual', connection, app.container.use('Adonis/Core/Event')).transaction(
        async (db) => {
          await db.insertQuery().table('users').insert({ username: 'virk' })
          throw new Error('should rollback')
        }
      )
    } catch (error) {
      assert.equal(error.message, 'should rollback')
    }

    const results = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    )
      .query()
      .from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform nested managed transactions', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    /**
     * Transaction 1
     */
    await new QueryClient('dual', connection, app.container.use('Adonis/Core/Event')).transaction(
      async (db) => {
        await db.insertQuery().table('users').insert({ username: 'virk' })

        /**
         * Transaction 2: Save point
         */
        await db.transaction(async (db1) => {
          await db1.insertQuery().table('users').insert({ username: 'nikk' })

          /**
           * Manual callback, should work fine
           */
          await db1.rollback()
        })
      }
    )

    const results = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    )
      .query()
      .from('users')
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('nest transaction queries inside profiler row', async (assert) => {
    const stack: { id: string; parentId: string | undefined; label: string; data: any }[] = []
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const profiler = app.profiler
    const client = new QueryClient('dual', connection, app.container.use('Adonis/Core/Event'))
    client.profiler = profiler

    profiler.process((log) => {
      stack.push({ id: log['id'], parentId: log.parent_id, label: log.label, data: log.data })
    })

    const db = await client.transaction()
    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.commit()

    assert.lengthOf(stack, 2)
    assert.equal(stack[0].label, 'db:query')
    assert.equal(stack[1].label, 'trx:begin')
    assert.equal(stack[0].parentId, stack[1].id)
    assert.deepEqual(stack[1].data, { state: 'commit' })

    await connection.disconnect()
  })

  test('nest save points queries inside profiler row', async (assert) => {
    const stack: { id: string; parentId: string | undefined; label: string; data: any }[] = []
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const profiler = app.profiler
    const client = new QueryClient('dual', connection, app.container.use('Adonis/Core/Event'))
    client.profiler = profiler

    profiler.process((log) => {
      stack.push({ id: log['id'], parentId: log.parent_id, label: log.label, data: log.data })
    })

    const db = await client.transaction()
    const nested = await db.transaction()
    await nested.insertQuery().table('users').insert({ username: 'virk' })
    await nested.rollback()
    await db.commit()

    assert.lengthOf(stack, 3)
    assert.equal(stack[0].label, 'db:query')
    assert.equal(stack[1].label, 'trx:begin')
    assert.equal(stack[2].label, 'trx:begin')
    assert.equal(stack[0].parentId, stack[1].id)
    assert.deepEqual(stack[1].data, { state: 'rollback' })
    assert.deepEqual(stack[2].data, { state: 'commit' })
    assert.equal(stack[1].parentId, stack[2].id)

    await connection.disconnect()
  })

  test('nest transaction queries inside managed transaction', async (assert) => {
    const stack: { id: string; parentId: string | undefined; label: string; data: any }[] = []
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const profiler = app.profiler
    const client = new QueryClient('dual', connection, app.container.use('Adonis/Core/Event'))
    client.profiler = profiler

    profiler.process((log) => {
      stack.push({ id: log['id'], parentId: log.parent_id, label: log.label, data: log.data })
    })

    await client.transaction(async (db) => {
      await db.insertQuery().table('users').insert({ username: 'virk' })
    })

    assert.lengthOf(stack, 2)
    assert.equal(stack[0].label, 'db:query')
    assert.equal(stack[1].label, 'trx:begin')
    assert.equal(stack[0].parentId, stack[1].id)
    assert.deepEqual(stack[1].data, { state: 'commit' })

    await connection.disconnect()
  })

  test('execute after commit hook', async (assert) => {
    const stack: string[] = []
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    ).transaction()

    db.after('commit', async () => {
      stack.push('commit')
    })

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.commit()
    assert.deepEqual(stack, ['commit'])

    await connection.disconnect()
  })

  test('execute after rollback hook', async (assert) => {
    const stack: string[] = []
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = await new QueryClient(
      'dual',
      connection,
      app.container.use('Adonis/Core/Event')
    ).transaction()

    db.after('rollback', async () => {
      stack.push('rollback')
    })

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.rollback()
    assert.deepEqual(db.listenerCount('commit'), 0)
    assert.deepEqual(db.listenerCount('rollback'), 0)
    assert.deepEqual(stack, ['rollback'])

    await connection.disconnect()
  })
})
