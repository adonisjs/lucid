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
import { TransactionClient } from '../../src/transaction_client/index.js'
import {
  setup,
  cleanup,
  getConfig,
  resetTables,
  logger,
  createEmitter,
} from '../../test-helpers/index.js'

test.group('Transaction | query', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('perform select query under a transaction', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = await new QueryClient('dual', connection, createEmitter()).transaction()
    const results = await db.query().from('users')
    await db.commit()

    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('commit insert', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = await new QueryClient('dual', connection, createEmitter()).transaction()
    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.commit()

    const results = await new QueryClient('dual', connection, createEmitter()).query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('rollback insert', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = await new QueryClient('dual', connection, createEmitter()).transaction()
    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.rollback()

    const results = await new QueryClient('dual', connection, createEmitter()).query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform nested transactions with save points', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    /**
     * Transaction 1
     */
    const db = await new QueryClient('dual', connection, createEmitter()).transaction()
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

    const results = await new QueryClient('dual', connection, createEmitter()).query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('emit after commit event', async ({ assert }) => {
    const stack: string[] = []
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = await new QueryClient('dual', connection, createEmitter()).transaction()

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

  test('emit after rollback event', async ({ assert }) => {
    const stack: string[] = []
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = await new QueryClient('dual', connection, createEmitter()).transaction()

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

  test('commit insert inside a self managed transaction', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    await new QueryClient('dual', connection, createEmitter()).transaction(async (db) => {
      await db.insertQuery().table('users').insert({ username: 'virk' })
    })

    const results = await new QueryClient('dual', connection, createEmitter()).query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('rollback insert inside a self managed transaction', async ({ assert }) => {
    assert.plan(3)

    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    try {
      await new QueryClient('dual', connection, createEmitter()).transaction(async (db) => {
        await db.insertQuery().table('users').insert({ username: 'virk' })
        throw new Error('should rollback')
      })
    } catch (error) {
      assert.equal(error.message, 'should rollback')
    }

    const results = await new QueryClient('dual', connection, createEmitter()).query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 0)

    await connection.disconnect()
  })

  test('perform nested managed transactions', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    /**
     * Transaction 1
     */
    await new QueryClient('dual', connection, createEmitter()).transaction(async (db) => {
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
    })

    const results = await new QueryClient('dual', connection, createEmitter()).query().from('users')
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].username, 'virk')

    await connection.disconnect()
  })

  test('execute after commit hook', async ({ assert }) => {
    const stack: string[] = []
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = await new QueryClient('dual', connection, createEmitter()).transaction()

    db.after('commit', async () => {
      stack.push('commit')
    })

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.commit()
    assert.deepEqual(stack, ['commit'])

    await connection.disconnect()
  })

  test('execute after rollback hook', async ({ assert }) => {
    const stack: string[] = []
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = await new QueryClient('dual', connection, createEmitter()).transaction()

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
