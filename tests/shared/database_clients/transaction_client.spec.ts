/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../../../src/debug.js'
import { dbSetup, getConnectionConfig } from '../../helpers.js'
import { Connection } from '../../../src/connection/connection.js'
import { SelectQueryBuilder } from '../../../src/query_builders/select_query_builder.js'
import { InsertQueryBuilder } from '../../../src/query_builders/insert_query_builder.js'
import { UpdateQueryBuilder } from '../../../src/query_builders/update_query_builder.js'
import { DeleteQueryBuilder } from '../../../src/query_builders/delete_query_builder.js'
import { TransactionClient } from '../../../src/database_clients/transaction_client.js'

test.group('Transaction client', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('initiate client', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = await connection.getQueryClient().transaction()
    await client.commit()

    assert.equal(client.connectionIdentifier, connection.identifier)
    assert.equal(client.connectionName, connection.identifier)
    assert.equal(client.mode, 'dual')
  })

  test('get access to knex clients', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = await connection.getQueryClient().transaction()
    await client.commit()

    assert.isDefined(client.getReadClient())
    assert.isDefined(client.getWriteClient())
    assert.isTrue(client.getWriteClient().isTransaction)
    assert.isTrue(client.getReadClient().isTransaction)
  })

  test('get knex clients in write mode', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = await connection.getQueryClient('write').transaction()
    await client.commit()

    assert.isDefined(client.getReadClient())
    assert.isDefined(client.getWriteClient())
    assert.isTrue(client.getWriteClient().isTransaction)
    assert.isTrue(client.getReadClient().isTransaction)
  })

  test('throw error when trying to create transaction client in read mode', async ({
    assert,
    cleanup,
  }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    assert.rejects(
      () => connection.getQueryClient('read').transaction(),
      'Cannot begin transaction, since the database client is in read-only mode'
    )
  })

  test('create instance of select query builder', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = await connection.getQueryClient('write').transaction()
    await client.commit()
    let query!: SelectQueryBuilder

    client.onQuery(($query) => {
      query = $query
    })

    assert.strictEqual(client.from('users'), query)
    assert.instanceOf(query, SelectQueryBuilder)
  })

  test('create instance of insert query builder', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = await connection.getQueryClient('write').transaction()
    await client.commit()
    let query!: InsertQueryBuilder

    client.onInsertQuery(($query) => {
      query = $query
    })

    assert.strictEqual(client.table('users'), query)
    assert.instanceOf(query, InsertQueryBuilder)
  })

  test('create instance of update query builder', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = await connection.getQueryClient('write').transaction()
    await client.commit()
    let query!: UpdateQueryBuilder

    client.onUpdateQuery(($query) => {
      query = $query
    })

    assert.strictEqual(client.updateTable('users'), query)
    assert.instanceOf(query, UpdateQueryBuilder)
  })

  test('create instance of delete query builder', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = await connection.getQueryClient('write').transaction()
    await client.commit()
    let query!: DeleteQueryBuilder

    client.onDeleteQuery(($query) => {
      query = $query
    })

    assert.strictEqual(client.deleteFrom('users'), query)
    assert.instanceOf(query, DeleteQueryBuilder)
  })

  test('share context with query', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    client.setContext({ userId: 1 })
    client.withContext({ requestId: 1 })

    await client.commit()

    assert.deepEqual(client.getContext(), {
      userId: 1,
      requestId: 1,
    })
    assert.deepEqual(client.selectFrom('users').getContext(), {
      userId: 1,
      requestId: 1,
    })
    assert.deepEqual(client.insertInto('users').getContext(), {
      userId: 1,
      requestId: 1,
    })
    assert.deepEqual(client.deleteFrom('users').getContext(), {
      userId: 1,
      requestId: 1,
    })
    assert.deepEqual(client.updateTable('users').getContext(), {
      userId: 1,
      requestId: 1,
    })
  })

  test('get access to connection dialect', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    await client.commit()

    assert.strictEqual(client.getDialect(), connection.dialect)
  })

  test('execute a query', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    const results = await client.exec(client.selectFrom('users'))
    await client.commit()

    assert.isArray(results)
  })

  test('emit db:query event when debugging is enabled', async ({ assert, cleanup }) => {
    const events: any[] = []

    const connection = new Connection('primary', getConnectionConfig(), undefined, {
      emit(name, payload) {
        events.push({ name, payload })
      },
      hasListeners() {
        return true
      },
    })
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    await client.exec(client.selectFrom('users').debug())
    await client.commit()

    debug('%O', events[0])
    assert.lengthOf(events, 1)
    assert.equal(events[0].name, 'db:query')
    assert.equal(events[0].payload.sql, client.getWriteClient().select().from('users').toSQL().sql)
    assert.properties(events[0].payload, ['duration', '__knexUid', '__knexTxId'])
  })

  test('emit db:query event with custom context', async ({ assert, cleanup }) => {
    const events: any[] = []

    const connection = new Connection('primary', getConnectionConfig(), undefined, {
      emit(name, payload) {
        events.push({ name, payload })
      },
      hasListeners() {
        return true
      },
    })
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    await client.exec(client.selectFrom('users').debug().withContext({ userId: 1 }))
    await client.commit()

    debug('%O', events[0])
    assert.lengthOf(events, 1)
    assert.equal(events[0].name, 'db:query')
    assert.equal(events[0].payload.userId, 1)
  })

  test('emit db:transaction:commit event', async ({ assert, cleanup }) => {
    const events: any[] = []

    const connection = new Connection('primary', getConnectionConfig(), undefined, {
      emit(name, payload) {
        events.push({ name, payload })
      },
      hasListeners() {
        return true
      },
    })
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    client.debug = true

    await client.exec(client.selectFrom('users'))
    await client.commit()

    debug('%O', events[0])
    assert.lengthOf(events, 1)
    assert.equal(events[0].name, 'db:transaction:commit')
    assert.property(events[0].payload, 'duration')
  })

  test('create save point', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    const trx = await client.transaction()
    await trx.commit()
    await client.commit()

    assert.instanceOf(trx, TransactionClient)
    assert.isTrue(trx.isCompleted)

    assert.instanceOf(client, TransactionClient)
    assert.isTrue(client.isCompleted)
  })

  test('copy hooks to the transaction', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    let query!: SelectQueryBuilder
    let insertQuery!: InsertQueryBuilder
    let updateQuery!: UpdateQueryBuilder
    let deleteQuery!: DeleteQueryBuilder

    const client = await connection.getQueryClient('write').transaction()
    client.onQuery(($query) => {
      query = $query
    })
    client.onInsertQuery(($query) => {
      insertQuery = $query
    })
    client.onUpdateQuery(($query) => {
      updateQuery = $query
    })
    client.onDeleteQuery(($query) => {
      deleteQuery = $query
    })

    const trx = await client.transaction()
    await trx.commit()
    await client.commit()

    assert.strictEqual(trx.selectFrom('users'), query)
    assert.instanceOf(query, SelectQueryBuilder)

    assert.strictEqual(trx.insertInto('users'), insertQuery)
    assert.instanceOf(insertQuery, InsertQueryBuilder)

    assert.strictEqual(trx.updateTable('users'), updateQuery)
    assert.instanceOf(updateQuery, UpdateQueryBuilder)

    assert.strictEqual(trx.deleteFrom('users'), deleteQuery)
    assert.instanceOf(deleteQuery, DeleteQueryBuilder)
  })

  test('auto commit managed transaction', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    let trx!: TransactionClient

    await client.transaction(($trx) => {
      trx = $trx
    })
    await client.commit()

    assert.instanceOf(trx, TransactionClient)
    assert.isTrue(trx.isCompleted)
  })

  test('auto rollback managed transaction', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = await connection.getQueryClient('write').transaction()
    let trx!: TransactionClient

    await assert.rejects(
      () =>
        client.transaction(($trx) => {
          trx = $trx
          throw new Error('Something went wrong')
        }),
      'Something went wrong'
    )
    await client.commit()

    assert.instanceOf(trx, TransactionClient)
    assert.isTrue(trx.isCompleted)
  })

  test('execute after commit hooks', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const stack: string[] = []
    const client = await connection.getQueryClient('write').transaction()
    client.after('commit', function () {
      stack.push('after commit')
    })

    await client.commit()
    assert.deepEqual(stack, ['after commit'])
  })

  test('execute after rollback hooks', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const stack: string[] = []
    const client = await connection.getQueryClient('write').transaction()
    client.after('commit', function () {
      stack.push('after commit')
    })
    client.after('rollback', function () {
      stack.push('after rollback')
    })

    await client.rollback()
    assert.deepEqual(stack, ['after rollback'])
  })
})
