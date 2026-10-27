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
  type IsolationLevels,
  type ConnectionConfig,
  type QueryClientContract,
} from '../../src/types/database.js'
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
    } catch (error: any) {
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

  test('ignore transaction options when creating a managed savepoint', async ({
    assert,
    cleanup: testCleanup,
  }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    testCleanup(() => connection.disconnect())

    await new QueryClient('dual', connection, createEmitter()).transaction(async (db) => {
      await db.insertQuery().table('users').insert({ username: 'virk' })
      await db.transaction(
        async (db1) => {
          await db1.insertQuery().table('users').insert({ username: 'nikk' })
        },
        { isolationLevel: 'serializable', readOnly: true }
      )
    })

    const results = await new QueryClient('dual', connection, createEmitter())
      .query()
      .from('users')
      .orderBy('id')
    assert.deepEqual(
      results.map((row) => row.username),
      ['virk', 'nikk']
    )
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

if (process.env.DB === 'pg') {
  /**
   * Returns the connection config with the default isolation level of
   * every session set explicitly, so that assertions do not depend
   * upon the server default
   */
  function getConfigWithDefaultIsolation(isolationLevel: IsolationLevels): ConnectionConfig {
    return Object.assign({}, getConfig(), {
      pool: {
        afterCreate: (conn: any, done: any) => {
          conn.query(
            `SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL ${isolationLevel}`,
            (error: Error | null) => done(error, conn)
          )
        },
      },
    })
  }

  /**
   * Returns the isolation level reported by PostgreSQL for the client
   */
  async function getIsolationLevel(client: QueryClientContract) {
    const { rows } = await client.rawQuery('SHOW transaction_isolation')
    return rows[0].transaction_isolation
  }

  test.group('Transaction | isolation level', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('apply "{isolationLevel}" isolation level to a manual transaction')
      .with([
        { isolationLevel: 'serializable', sessionDefault: 'read committed' },
        { isolationLevel: 'repeatable read', sessionDefault: 'read committed' },
        { isolationLevel: 'read committed', sessionDefault: 'serializable' },
      ] as const)
      .run(async ({ assert, cleanup: testCleanup }, { isolationLevel, sessionDefault }) => {
        const connection = new Connection(
          'primary',
          getConfigWithDefaultIsolation(sessionDefault),
          logger
        )
        connection.connect()
        testCleanup(() => connection.disconnect())

        const client = new QueryClient('dual', connection, createEmitter())
        assert.equal(await getIsolationLevel(client), sessionDefault)

        const trx = await client.transaction({ isolationLevel })
        testCleanup(async () => {
          if (!trx.isCompleted) await trx.rollback()
        })

        assert.equal(await getIsolationLevel(trx), isolationLevel)
        await trx.rollback()
      })

    test('apply isolation level to a managed transaction', async ({
      assert,
      cleanup: testCleanup,
    }) => {
      const connection = new Connection(
        'primary',
        getConfigWithDefaultIsolation('read committed'),
        logger
      )
      connection.connect()
      testCleanup(() => connection.disconnect())

      const client = new QueryClient('dual', connection, createEmitter())
      assert.equal(await getIsolationLevel(client), 'read committed')

      const isolationLevel = await client.transaction((trx) => getIsolationLevel(trx), {
        isolationLevel: 'serializable',
      })
      assert.equal(isolationLevel, 'serializable')
    })

    test('use the session default when isolation level is not defined', async ({
      assert,
      cleanup: testCleanup,
    }) => {
      const connection = new Connection(
        'primary',
        getConfigWithDefaultIsolation('repeatable read'),
        logger
      )
      connection.connect()
      testCleanup(() => connection.disconnect())

      const client = new QueryClient('dual', connection, createEmitter())

      const trx = await client.transaction()
      testCleanup(async () => {
        if (!trx.isCompleted) await trx.rollback()
      })
      assert.equal(await getIsolationLevel(trx), 'repeatable read')
      await trx.rollback()

      const isolationLevel = await client.transaction((managedTrx) => getIsolationLevel(managedTrx))
      assert.equal(isolationLevel, 'repeatable read')
    })

    test('savepoints inherit the isolation level of the outer transaction', async ({
      assert,
      cleanup: testCleanup,
    }) => {
      const connection = new Connection(
        'primary',
        getConfigWithDefaultIsolation('read committed'),
        logger
      )
      connection.connect()
      testCleanup(() => connection.disconnect())

      const client = new QueryClient('dual', connection, createEmitter())
      await client.transaction(
        async (trx) => {
          /**
           * PostgreSQL cannot change the isolation level of a savepoint
           */
          const savepoint = await trx.transaction({ isolationLevel: 'read committed' })
          assert.equal(await getIsolationLevel(savepoint), 'serializable')
          await savepoint.rollback()

          assert.equal(await getIsolationLevel(trx), 'serializable')
        },
        { isolationLevel: 'serializable' }
      )
    })

    test('release connection after rolling back a transaction with isolation level', async ({
      assert,
      cleanup: testCleanup,
    }) => {
      const connection = new Connection(
        'primary',
        getConfigWithDefaultIsolation('read committed'),
        logger
      )
      connection.connect()
      testCleanup(() => connection.disconnect())

      const client = new QueryClient('dual', connection, createEmitter())
      const trx = await client.transaction({ isolationLevel: 'serializable' })
      testCleanup(async () => {
        if (!trx.isCompleted) await trx.rollback()
      })

      await trx.insertQuery().table('users').insert({ username: 'virk' })
      assert.equal(await getIsolationLevel(trx), 'serializable')
      await trx.rollback()

      assert.isTrue(trx.isCompleted)
      assert.equal(connection.pool!.numUsed(), 0)
      assert.lengthOf(await client.query().from('users'), 0)
      assert.equal(await getIsolationLevel(client), 'read committed')
    })

    test('reject writes inside a read only manual transaction', async ({
      assert,
      cleanup: testCleanup,
    }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      testCleanup(() => connection.disconnect())

      const client = new QueryClient('dual', connection, createEmitter())
      const trx = await client.transaction({ isolationLevel: 'serializable', readOnly: true })
      testCleanup(async () => {
        if (!trx.isCompleted) await trx.rollback()
      })

      assert.equal(await getIsolationLevel(trx), 'serializable')
      const error = await trx
        .insertQuery()
        .table('users')
        .insert({ username: 'virk' })
        .catch((e) => e)

      assert.equal(error.code, '25006')
      await trx.rollback()
    })

    test('reject writes inside a read only managed transaction', async ({
      assert,
      cleanup: testCleanup,
    }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      testCleanup(() => connection.disconnect())

      const client = new QueryClient('dual', connection, createEmitter())
      const error = await client
        .transaction((trx) => trx.insertQuery().table('users').insert({ username: 'virk' }), {
          readOnly: true,
        })
        .catch((e) => e)

      assert.equal(error.code, '25006')
      assert.lengthOf(await client.query().from('users'), 0)
    })
  })
}

if (['mysql', 'mysql_legacy'].includes(process.env.DB!)) {
  /**
   * Returns the connection config with the default isolation level of
   * every session set explicitly, so that assertions do not depend
   * upon the server default
   */
  function getConfigWithDefaultIsolation(isolationLevel: IsolationLevels): ConnectionConfig {
    return Object.assign({}, getConfig(), {
      pool: {
        afterCreate: (conn: any, done: any) => {
          conn.query(
            `SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`,
            (error: Error | null) => done(error, conn)
          )
        },
      },
    })
  }

  test.group('Transaction | isolation level', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    /**
     * MySQL reports the isolation level of the session, not the one of the
     * running transaction. So the test checks the effect of the level instead:
     * whether the transaction sees a change committed by another connection
     * after its first read
     */
    test('apply "{isolationLevel}" isolation level to a manual transaction')
      .with([
        { isolationLevel: 'read committed', sessionDefault: 'repeatable read', seesChange: true },
        { isolationLevel: 'repeatable read', sessionDefault: 'read committed', seesChange: false },
      ] as const)
      .run(
        async (
          { assert, cleanup: testCleanup },
          { isolationLevel, sessionDefault, seesChange }
        ) => {
          const connection = new Connection(
            'primary',
            getConfigWithDefaultIsolation(sessionDefault),
            logger
          )
          connection.connect()
          testCleanup(() => connection.disconnect())

          const client = new QueryClient('dual', connection, createEmitter())
          const [rows] = await client.rawQuery('SELECT @@session.transaction_isolation AS level')
          assert.equal(rows[0].level, sessionDefault.toUpperCase().replace(' ', '-'))

          await client.insertQuery().table('users').insert({ username: 'virk', points: 0 })

          const trx = await client.transaction({ isolationLevel })
          testCleanup(async () => {
            if (!trx.isCompleted) await trx.rollback()
          })

          const user = await trx.query().from('users').where('username', 'virk').first()
          assert.equal(user.points, 0)

          await client.query().from('users').where('username', 'virk').update({ points: 1 })

          const userAfterChange = await trx.query().from('users').where('username', 'virk').first()
          assert.equal(userAfterChange.points, seesChange ? 1 : 0)
          await trx.rollback()
        }
      )

    test('reject writes inside a read only {form} transaction')
      .with([{ form: 'manual' }, { form: 'managed' }] as const)
      .run(async ({ assert, cleanup: testCleanup }, { form }) => {
        const connection = new Connection('primary', getConfig(), logger)
        connection.connect()
        testCleanup(() => connection.disconnect())

        const client = new QueryClient('dual', connection, createEmitter())
        let error: any

        if (form === 'manual') {
          const trx = await client.transaction({ readOnly: true })
          testCleanup(async () => {
            if (!trx.isCompleted) await trx.rollback()
          })
          error = await trx
            .insertQuery()
            .table('users')
            .insert({ username: 'virk' })
            .catch((e) => e)
          await trx.rollback()
        } else {
          error = await client
            .transaction((trx) => trx.insertQuery().table('users').insert({ username: 'virk' }), {
              readOnly: true,
            })
            .catch((e) => e)
        }

        assert.equal(error.code, 'ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION')
        assert.lengthOf(await client.query().from('users'), 0)
      })
  })
}

if (['sqlite', 'better_sqlite', 'libsql'].includes(process.env.DB!)) {
  /**
   * Returns the value of the foreign keys pragma for the client
   */
  async function getForeignKeysPragma(client: QueryClientContract) {
    const rows = await client.rawQuery('PRAGMA foreign_keys')
    return rows[0].foreign_keys
  }

  test.group('Transaction | foreign keys check', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    test('set foreign keys pragma to "{enforceForeignCheck}" inside a manual transaction')
      .with([{ enforceForeignCheck: true }, { enforceForeignCheck: false }] as const)
      .run(async ({ assert, cleanup: testCleanup }, { enforceForeignCheck }) => {
        const connection = new Connection('primary', getConfig(), logger)
        connection.connect()
        testCleanup(() => connection.disconnect())

        const client = new QueryClient('dual', connection, createEmitter())
        const pragmaBefore = await getForeignKeysPragma(client)

        const trx = await client.transaction({ enforceForeignCheck })
        testCleanup(async () => {
          if (!trx.isCompleted) await trx.rollback()
        })

        assert.equal(await getForeignKeysPragma(trx), enforceForeignCheck ? 1 : 0)
        await trx.rollback()

        assert.equal(await getForeignKeysPragma(client), pragmaBefore)
      })

    test('set foreign keys pragma inside a managed transaction', async ({
      assert,
      cleanup: testCleanup,
    }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      testCleanup(() => connection.disconnect())

      const client = new QueryClient('dual', connection, createEmitter())
      const pragma = await client.transaction((trx) => getForeignKeysPragma(trx), {
        enforceForeignCheck: false,
      })

      assert.equal(pragma, 0)
    })
  })
}
