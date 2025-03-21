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

test.group('Query client', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('initiate client', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = connection.getQueryClient()
    assert.equal(client.connectionIdentifier, connection.identifier)
    assert.equal(client.connectionName, connection.identifier)
  })

  test('get knex clients in dual mode', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = connection.getQueryClient()
    assert.isDefined(client.getReadClient())
    assert.isDefined(client.getWriteClient())
  })

  test('get knex clients in write mode', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = connection.getQueryClient('write')
    assert.isDefined(client.getReadClient())
    assert.isDefined(client.getWriteClient())
  })

  test('throw when trying to access write client in read mode', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = connection.getQueryClient('read')
    assert.isDefined(client.getReadClient())
    assert.throws(
      () => client.getWriteClient(),
      'Cannot access the connection for write queries, since the database client is in read-only mode'
    )
  })

  test('create instance of select query builder', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = connection.getQueryClient('write')
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

    const client = connection.getQueryClient('write')
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

    const client = connection.getQueryClient('write')
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

    const client = connection.getQueryClient('write')
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

    const client = connection.getQueryClient('write')
    client.setContext({ userId: 1 })
    client.withContext({ requestId: 1 })

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

    const client = connection.getQueryClient('write')
    assert.strictEqual(client.getDialect(), connection.dialect)
  })

  test('throw error when trying to access dialect in read-only mode', async ({
    assert,
    cleanup,
  }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = connection.getQueryClient('read')
    assert.throws(
      () => client.getDialect(),
      'Cannot access the connection for write queries, since the database client is in read-only mode'
    )
  })

  test('execute a query', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = connection.getQueryClient('write')
    const results = await client.exec(client.selectFrom('users'))
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

    const client = connection.getQueryClient('write')
    await client.exec(client.selectFrom('users').debug())

    debug('%O', events[0])
    assert.lengthOf(events, 1)
    assert.equal(events[0].name, 'db:query')
    assert.equal(events[0].payload.sql, client.getWriteClient().select().from('users').toSQL().sql)
    assert.properties(events[0].payload, ['duration', '__knexUid', '__knexTxId'])
  })

  test('emit db:query event when custom context', async ({ assert, cleanup }) => {
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

    const client = connection.getQueryClient('write')
    await client.exec(client.selectFrom('users').debug().withContext({ userId: 1 }))

    debug('%O', events[0])
    assert.lengthOf(events, 1)
    assert.equal(events[0].name, 'db:query')
    assert.equal(events[0].payload.userId, 1)
  })

  test('release connection when query throws an error', async ({ assert, cleanup }) => {
    let didReleaseConnection = false

    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = connection.getQueryClient('write')
    const knexClient = client.getReadClient().client

    const originalReleaseConnection = knexClient.releaseConnection.bind(knexClient)
    knexClient.releaseConnection = function () {
      didReleaseConnection = true
      return originalReleaseConnection(...arguments)
    }

    await assert.rejects(() => client.exec(client.selectFrom('foo')))
    assert.isTrue(didReleaseConnection)
  })

  test('switch query client after creating the query', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = connection.getQueryClient('write')

    /**
     * Switched to a read-only client. Hence cannot execute a write
     * query
     */
    const query = client.insertInto('users').values({}).use(connection.getQueryClient('read'))

    await assert.rejects(
      () => query.exec(),
      'Cannot access the connection for write queries, since the database client is in read-only mode'
    )
  })

  test('create transaction', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = connection.getQueryClient('write')
    const trx = await client.transaction()
    await trx.commit()

    assert.instanceOf(trx, TransactionClient)
    assert.isTrue(trx.isCompleted)
  })

  test('copy hooks to the transaction', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    let query!: SelectQueryBuilder
    let insertQuery!: InsertQueryBuilder
    let updateQuery!: UpdateQueryBuilder
    let deleteQuery!: DeleteQueryBuilder

    const client = connection.getQueryClient('write')
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

    const client = connection.getQueryClient('write')
    let trx!: TransactionClient

    await client.transaction(($trx) => {
      trx = $trx
    })

    assert.instanceOf(trx, TransactionClient)
    assert.isTrue(trx.isCompleted)
  })

  test('auto rollback managed transaction', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())
    await dbSetup(connection)

    const client = connection.getQueryClient('write')
    let trx!: TransactionClient

    await assert.rejects(
      () =>
        client.transaction(($trx) => {
          trx = $trx
          throw new Error('Something went wrong')
        }),
      'Something went wrong'
    )

    assert.instanceOf(trx, TransactionClient)
    assert.isTrue(trx.isCompleted)
  })
})
