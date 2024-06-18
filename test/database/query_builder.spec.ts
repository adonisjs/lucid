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
import { QueryRunner } from '../../src/query_runner/index.js'
import { DatabaseQueryBuilder } from '../../src/database/query_builder/database.js'
import {
  setup,
  cleanup,
  getDb,
  getConfig,
  getUsers,
  resetTables,
  getQueryClient,
  getQueryBuilder,
  getInsertBuilder,
  getRawQueryBuilder,
  logger,
  createEmitter,
} from '../../test-helpers/index.js'
import { QueryClient } from '../../src/query_client/index.js'

if (!['better_sqlite', 'sqlite', 'libsql'].includes(process.env.DB!)) {
  test.group('Query Builder | client', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('use read client when making select query', async ({ assert }) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getReadClient = function getReadClient(this: QueryClient) {
        assert.isTrue(true)
        return this['connection'].client!
      }

      await new QueryRunner(client, false, null).run(db.select('*').from('users').knexQuery)
      await connection.disconnect()
    })

    test('use write client for update', async ({ assert }) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getWriteClient = function getWriteClient(this: QueryClient) {
        assert.isTrue(true)
        return this['connection'].client!
      }

      await new QueryRunner(client, false, null).run(
        db.from('users').update('username', 'virk').knexQuery
      )
      await connection.disconnect()
    })

    test('use write client for delete', async ({ assert }) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getWriteClient = function getWriteClient(this: QueryClient) {
        assert.isTrue(true)
        return this['connection'].client!
      }

      await new QueryRunner(client, false, null).run(db.from('users').del().knexQuery)
      await connection.disconnect()
    })

    test('use write client for inserts', async ({ assert }) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      const db = getInsertBuilder(client)

      client.getWriteClient = function getWriteClient(this: QueryClient) {
        assert.isTrue(true)
        return this['connection'].client!
      }

      await new QueryRunner(client, false, null).run(
        db.table('users').insert({ username: 'virk' }).knexQuery
      )
      await connection.disconnect()
    })

    test('use transaction client when query is used inside a transaction', async () => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getReadClient = function getReadClient() {
        throw new Error('Never expected to reach here')
      }

      const trx = await client.transaction()
      await new QueryRunner(client, false, null).run(
        db.select('*').from('users').useTransaction(trx).knexQuery
      )
      await trx.commit()
      await connection.disconnect()
    })

    test('use transaction client when insert query is used inside a transaction', async () => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      const db = getInsertBuilder(client)

      client.getReadClient = function getReadClient() {
        throw new Error('Never expected to reach here')
      }

      const trx = await client.transaction()

      await new QueryRunner(client, false, null).run(
        db.table('users').useTransaction(trx).insert({ username: 'virk' }).knexQuery
      )

      await trx.rollback()
      await connection.disconnect()
    })

    test('use transaction client when query is issued from transaction client', async () => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)

      client.getReadClient = function getReadClient() {
        throw new Error('Never expected to reach here')
      }

      const trx = await client.transaction()
      await new QueryRunner(client, false, null).run(
        trx.query().select('*').from('users').knexQuery
      )
      await trx.commit()
      await connection.disconnect()
    })

    test('use transaction client when insert query is issued from transaction client', async () => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)

      const trx = await client.transaction()
      trx.getReadClient = function getReadClient() {
        throw new Error('Never expected to reach here')
      }

      await new QueryRunner(trx, false, null).run(
        trx.insertQuery().table('users').insert({ username: 'virk' }).knexQuery
      )
      await trx.commit()

      await connection.disconnect()
    })
  })
}

test.group('Query Builder | from', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define query table', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!.from('users').toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define table alias', ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from({ u: 'users' }).toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!.from({ u: 'users' }).toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Query Builder | select', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define columns as array', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select(['username']).toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select('username')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns with aliases', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select(['username as u']).toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select('username as u')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as multiple arguments', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select('username', 'email').toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select('username', 'email')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as multiple arguments with aliases', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select('username as u', 'email as e').toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select('username as u', 'email as e')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as subqueries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const db1 = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db
      .from('users')
      .select(db1.from('addresses').count('* as total').as('addresses_total'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select(connection.client!.from('addresses').count('* as total').as('addresses_total'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as subqueries inside an array', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const db1 = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db
      .from('users')
      .select([db1.from('addresses').count('* as total').as('addresses_total')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select(connection.client!.from('addresses').count('* as total').as('addresses_total'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('chain select calls', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const db1 = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db
      .from('users')
      .select('*')
      .select(db1.from('addresses').count('* as total').as('addresses_total'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select('*', connection.client!.from('addresses').count('* as total').as('addresses_total'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as raw queries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db
      .from('users')
      .select(
        getQueryClient(connection).raw(
          '(select count(*) as total from addresses) as addresses_total'
        )
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select(
        connection.client!.raw('(select count(*) as total from addresses) as addresses_total')
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | where', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').where('username', 'virk').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('username', 'virk')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where('my_username', 'virk')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap where clause to its own group', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('username', 'virk')
      .orWhere('email', 'virk')
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.where('username', 'virk').orWhere('email', 'virk'))
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('username', 'virk')
      .orWhere('email', 'virk')
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.where('my_username', 'virk').orWhere('my_email', 'virk'))
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where clause as an object', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').where({ username: 'virk', age: 22 }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where({ username: 'virk', age: 22 })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where({ username: 'virk', age: 22 })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where({ my_username: 'virk', my_age: 22 })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where wrapped clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where((builder) => builder.where('username', 'virk'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((builder) => builder.where('username', 'virk'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where((builder) => builder.where('username', 'virk'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((builder) => builder.where('my_username', 'virk'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap already wrapped where clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where((builder) => builder.where('username', 'virk'))
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((builder) => builder.where((s) => s.where('username', 'virk')))
      .where((builder) => builder.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where((builder) => builder.where('username', 'virk'))
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((builder) => builder.where((s) => s.where('my_username', 'virk')))
      .where((builder) => builder.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where clause with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').where('age', '>', 22).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('age', '>', 22)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('age', '>', 22)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where('my_age', '>', 22)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap where clause with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', 22)
      .wrapExisting()
      .orWhereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.where('age', '>', 22))
      .orWhere((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('age', '>', 22)
      .wrapExisting()
      .orWhereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.where('my_age', '>', 22))
      .orWhere((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where(
        'age',
        '>',
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('wrap raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where(
        'age',
        '>',
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;')
      )
      .wrapExisting()
      .whereNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.where('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      )
      .where((q) => q.whereNotNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add where clause as a raw builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('wrap raw query builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add orWhere clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').where('age', '>', 22).orWhere('age', 18).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('age', '>', 22)
      .orWhere('age', 18)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('age', '>', 22)
      .orWhere('age', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where('my_age', '>', 22)
      .orWhere('my_age', 18)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhere clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', 22)
      .wrapExisting()
      .orWhere('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.where('age', '>', 22))
      .orWhere((q) => q.where('age', 18))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('age', '>', 22)
      .wrapExisting()
      .orWhere('age', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.where('my_age', '>', 22))
      .orWhere((q) => q.where('my_age', 18))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhere wrapped clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', 22)
      .orWhere((builder) => {
        assert.instanceOf(builder, DatabaseQueryBuilder)
        builder.where('age', 18)
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('age', '>', 22)
      .orWhere((builder) => {
        builder.where('age', 18)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('age', '>', 22)
      .orWhere((builder) => {
        assert.instanceOf(builder, DatabaseQueryBuilder)
        builder.where('age', 18)
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where('my_age', '>', 22)
      .orWhere((builder) => {
        builder.where('my_age', 18)
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhere wrapped clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', 22)
      .wrapExisting()
      .orWhere((builder) => {
        assert.instanceOf(builder, DatabaseQueryBuilder)
        builder.where('age', 18)
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.where('age', '>', 22))
      .orWhere((q) => q.where((s) => s.where('age', 18)))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('age', '>', 22)
      .wrapExisting()
      .orWhere((builder) => {
        assert.instanceOf(builder, DatabaseQueryBuilder)
        builder.where('age', 18)
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.where('my_age', '>', 22))
      .orWhere((builder) => {
        builder.where((s) => s.where('my_age', 18))
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where clause using ref', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').where('username', 'virk').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('username', getDb().ref('foo.username'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where('my_username', connection.client!.ref('foo.username'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap where clause using ref', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('username', getDb().ref('foo.username'))
      .wrapExisting()
      .orWhereNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.where('username', connection.client!.ref('foo.username')))
      .orWhere((q) => q.whereNotNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('username', getDb().ref('foo.username'))
      .wrapExisting()
      .orWhereNotNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.where('my_username', connection.client!.ref('foo.username')))
      .orWhere((q) => q.whereNotNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('allow raw query for the column name', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)
    const { sql, bindings } = db
      .from('users')
      .where(getRawQueryBuilder(client, 'age', []), '>', 22)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where(connection.client!.raw('age'), '>', 22)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNot', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where not clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereNot('username', 'virk').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot('username', 'virk')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot('my_username', 'virk')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap where not clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('username', 'virk')
      .wrapExisting()
      .whereNot('email', 'virk')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((query) => query.whereNot('username', 'virk'))
      .where((query) => query.whereNot('email', 'virk'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot('username', 'virk')
      .wrapExisting()
      .whereNot('email', 'virk')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((query) => query.whereNot('my_username', 'virk'))
      .where((query) => query.whereNot('my_email', 'virk'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not clause as an object', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereNot({ username: 'virk', age: 22 }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot({ username: 'virk', age: 22 })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot({ username: 'virk', age: 22 })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot({ my_username: 'virk', my_age: 22 })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where not wrapped clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot((builder) => builder.where('username', 'virk'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot((builder) => builder.where('username', 'virk'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot((builder) => builder.where('username', 'virk'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot((builder) => builder.where('my_username', 'virk'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap where not wrapped clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot((builder) => builder.where('username', 'virk'))
      .wrapExisting()
      .whereNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((builder) => builder.whereNot((s) => s.where('username', 'virk')))
      .where((builder) => builder.whereNotNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot((builder) => builder.where('username', 'virk'))
      .wrapExisting()
      .whereNotNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((builder) => builder.whereNot((s) => s.where('my_username', 'virk')))
      .where((builder) => builder.whereNotNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not clause with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereNot('age', '>', 22).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('age', '>', 22)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot('my_age', '>', 22)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap where not clause with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .wrapExisting()
      .whereNot('age', '<', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNot('age', '>', 22))
      .where((q) => q.whereNot('age', '<', 18))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .wrapExisting()
      .whereNot('age', '<', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNot('my_age', '>', 22))
      .where((q) => q.whereNot('my_age', '<', 18))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot(
        'age',
        '>',
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot(
        'age',
        '>',
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;')
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot('my_age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not clause as a raw builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('age', '>', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot('age', '>', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot('my_age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereNot clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .orWhereNot('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('age', '>', 22)
      .orWhereNot('age', 18)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .orWhereNot('age', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot('my_age', '>', 22)
      .orWhereNot('my_age', 18)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhereNot clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .wrapExisting()
      .orWhereNot('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNot('age', '>', 22))
      .orWhere((q) => q.whereNot('age', 18))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .wrapExisting()
      .orWhereNot('age', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNot('my_age', '>', 22))
      .orWhere((q) => q.whereNot('my_age', 18))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereNot wrapped clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', 22)
      .orWhereNot((builder) => {
        assert.instanceOf(builder, DatabaseQueryBuilder)
        builder.where('age', 18)
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('age', '>', 22)
      .orWhereNot((builder) => {
        builder.where('age', 18)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .where('age', '>', 22)
      .orWhereNot((builder) => {
        assert.instanceOf(builder, DatabaseQueryBuilder)
        builder.where('age', 18)
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where('my_age', '>', 22)
      .orWhereNot((builder) => {
        builder.where('my_age', 18)
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap where and whereNot clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('points', '<', 50)
      .where('age', 18)
      .wrapExisting()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((query) => {
        query.whereNot('points', '<', 50).where('age', 18)
      })
      .toSQL()

    console.log(sql, knexSql)

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereIn', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {})

  test('add whereIn clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereIn('username', ['virk', 'nikk']).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn('username', ['virk', 'nikk'])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn('my_username', ['virk', 'nikk'])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap whereIn clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereIn('username', ['virk', 'nikk']))
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereIn('my_username', ['virk', 'nikk']))
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereIn as a query callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db
      .from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn('my_username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap whereIn as a query callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .wrapExisting()
      .orWhereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereIn('username', (builder) => {
          builder.from('accounts')
        })
      )
      .orWhere((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .wrapExisting()
      .orWhereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereIn('my_username', (builder) => {
          builder.from('accounts')
        })
      )
      .orWhere((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereIn as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn(
        'username',
        getQueryBuilder(getQueryClient(connection)).select('id').from('accounts')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn('username', connection.client!.select('id').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn(
        'username',
        getQueryBuilder(getQueryClient(connection)).select('id').from('accounts')
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn('my_username', connection.client!.select('id').from('accounts'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereIn as a rawquery inside array', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const ref = connection.client!.ref.bind(connection.client!)

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', [
        getRawQueryBuilder(
          getQueryClient(connection),
          `select ${ref('id')} from ${ref('accounts')}`
        ),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn('username', [connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`)])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', [
        getRawQueryBuilder(
          getQueryClient(connection),
          `select ${ref('id')} from ${ref('accounts')}`
        ),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn('my_username', [
        connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap whereIn as a rawquery inside array', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const ref = connection.client!.ref.bind(connection.client!)

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', [
        getRawQueryBuilder(
          getQueryClient(connection),
          `select ${ref('id')} from ${ref('accounts')}`
        ),
      ])
      .wrapExisting()
      .andWhereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereIn('username', [
          connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
        ])
      )
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', [
        getRawQueryBuilder(
          getQueryClient(connection),
          `select ${ref('id')} from ${ref('accounts')}`
        ),
      ])
      .wrapExisting()
      .andWhereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereIn('my_username', [
          connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
        ])
      )
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereIn as a rawquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const ref = connection.client!.ref.bind(connection.client!)

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn(
        'username',
        getRawQueryBuilder(
          getQueryClient(connection),
          `select ${ref('id')} from ${ref('accounts')}`
        )
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn('username', [connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`)])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn(
        'username',
        getRawQueryBuilder(
          getQueryClient(connection),
          `select ${ref('id')} from ${ref('accounts')}`
        )
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn('my_username', [
        connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereIn as a raw builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const ref = connection.client!.ref.bind(connection.client!)

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', [getDb().raw(`select ${ref('id')} from ${ref('accounts')}`)])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn('username', [connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`)])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', [getDb().raw(`select ${ref('id')} from ${ref('accounts')}`)])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn('my_username', [
        connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereIn as a subquery with array of keys', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn(
        ['username', 'email'],
        getQueryBuilder(getQueryClient(connection)).select('username', 'email').from('accounts')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn(
        ['username', 'email'],
        connection.client!.select('username', 'email').from('accounts')
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn(
        ['username', 'email'],
        getQueryBuilder(getQueryClient(connection)).select('username', 'email').from('accounts')
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn(
        ['my_username', 'my_email'],
        connection.client!.select('username', 'email').from('accounts')
      )
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereIn as a 2d array', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn(['my_username', 'my_email'], [['foo', 'bar']])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereIn clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .orWhereIn('username', ['foo'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn('username', ['virk', 'nikk'])
      .orWhereIn('username', ['foo'])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .orWhereIn('username', ['foo'])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn('my_username', ['virk', 'nikk'])
      .orWhereIn('my_username', ['foo'])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhereIn clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .wrapExisting()
      .orWhereIn('username', ['foo'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereIn('username', ['virk', 'nikk']))
      .orWhere((q) => q.whereIn('username', ['foo']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .wrapExisting()
      .orWhereIn('username', ['foo'])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereIn('my_username', ['virk', 'nikk']))
      .orWhere((q) => q.whereIn('my_username', ['foo']))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereIn as a query callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .orWhereIn('username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .orWhereIn('username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .orWhereIn('username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereIn('my_username', (builder) => {
        builder.from('accounts')
      })
      .orWhereIn('my_username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNotIn', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add whereNotIn clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereNotIn('username', ['virk', 'nikk']).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotIn('my_username', ['virk', 'nikk'])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap whereNotIn clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotIn('username', ['virk', 'nikk']))
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotIn('my_username', ['virk', 'nikk']))
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereNotIn as a query callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotIn('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotIn('my_username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereNotIn as a sub query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn(
        'username',
        getQueryBuilder(getQueryClient(connection)).select('username').from('accounts')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotIn('username', connection.client!.select('username').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn(
        'username',
        getQueryBuilder(getQueryClient(connection)).select('username').from('accounts')
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotIn('my_username', connection.client!.select('username').from('accounts'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap whereNotIn as a sub query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn(
        'username',
        getQueryBuilder(getQueryClient(connection)).select('username').from('accounts')
      )
      .wrapExisting()
      .orWhereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereNotIn('username', connection.client!.select('username').from('accounts'))
      )
      .orWhere((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn(
        'username',
        getQueryBuilder(getQueryClient(connection)).select('username').from('accounts')
      )
      .wrapExisting()
      .orWhereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereNotIn('my_username', connection.client!.select('username').from('accounts'))
      )
      .orWhere((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereNotIn as a 2d array', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotIn(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotIn(['my_username', 'my_email'], [['foo', 'bar']])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereNotIn clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .orWhereNotIn('username', ['foo'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .orWhereNotIn('username', ['foo'])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .orWhereNotIn('username', ['foo'])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotIn('my_username', ['virk', 'nikk'])
      .orWhereNotIn('my_username', ['foo'])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhereNotIn clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .wrapExisting()
      .orWhereNotIn('username', ['foo'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotIn('username', ['virk', 'nikk']))
      .orWhere((q) => q.whereNotIn('username', ['foo']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .wrapExisting()
      .orWhereNotIn('username', ['foo'])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotIn('my_username', ['virk', 'nikk']))
      .orWhere((q) => q.whereNotIn('my_username', ['foo']))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereNotIn as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', (builder) => {
        builder.from('accounts')
      })
      .orWhereNotIn('username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotIn('username', (builder) => {
        builder.from('accounts')
      })
      .orWhereNotIn('username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn('username', (builder) => {
        builder.from('accounts')
      })
      .orWhereNotIn('username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotIn('my_username', (builder) => {
        builder.from('accounts')
      })
      .orWhereNotIn('my_username', (builder) => {
        builder.from('employees')
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNull', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereNull('deleted_at').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNull('deleted_at')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNull('my_deleted_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap where null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNull('deleted_at')
      .wrapExisting()
      .orWhereNull('created_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNull('deleted_at'))
      .orWhere((q) => q.whereNull('created_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNull('deleted_at')
      .wrapExisting()
      .orWhereNull('created_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNull('my_deleted_at'))
      .orWhere((q) => q.whereNull('my_created_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNull('deleted_at')
      .orWhereNull('updated_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNull('deleted_at')
      .orWhereNull('updated_at')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNull('deleted_at')
      .orWhereNull('updated_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNull('my_deleted_at')
      .orWhereNull('my_updated_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNotNull', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where not null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereNotNull('deleted_at').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotNull('deleted_at')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotNull('my_deleted_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap where not null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotNull('deleted_at')
      .wrapExisting()
      .orWhereNotNull('created_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotNull('deleted_at'))
      .orWhere((q) => q.whereNotNull('created_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotNull('deleted_at')
      .wrapExisting()
      .orWhereNotNull('created_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotNull('my_deleted_at'))
      .orWhere((q) => q.whereNotNull('my_created_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where not null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotNull('deleted_at')
      .orWhereNotNull('updated_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotNull('deleted_at')
      .orWhereNotNull('updated_at')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotNull('deleted_at')
      .orWhereNotNull('updated_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotNull('my_deleted_at')
      .orWhereNotNull('my_updated_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereExists', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('wrap where exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists((builder) => {
        builder.from('accounts')
      })
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereExists((builder) => {
          builder.from('accounts')
        })
      )
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add where exists clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereExists(connection.client!.from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('wrap where exists clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .wrapExisting()
      .orWhereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereExists(connection.client!.from('accounts')))
      .orWhere((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('wrap subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists(
        getQueryBuilder(getQueryClient(connection))
          .from('accounts')
          .where('status', 'active')
          .orWhere('status', 'pending')
          .wrapExisting()
          .whereNull('is_deleted')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereExists(
        connection
          .client!.from('accounts')
          .where((q) => {
            q.where('status', 'active').orWhere('status', 'pending')
          })
          .where((q) => q.whereNull('is_deleted'))
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add where exists clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists(getRawQueryBuilder(getQueryClient(connection), 'select * from accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereExists(connection.client!.raw('select * from accounts') as any)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orWhereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('wrap or where exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists((builder) => {
        builder.from('teams')
      })
      .wrapExisting()
      .orWhereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereExists((builder) => {
          builder.from('teams')
        })
      )
      .orWhere((q) =>
        q.whereExists((builder) => {
          builder.from('accounts')
        })
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where exists clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orWhereExists(connection.client!.from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('wrap or where exists clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists(getQueryBuilder(getQueryClient(connection)).from('teams'))
      .wrapExisting()
      .orWhereExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereExists(connection.client!.from('teams')))
      .orWhere((q) => q.whereExists(connection.client!.from('accounts')))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNotExists', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where not exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('wrap where not exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotExists((builder) => {
        builder.from('accounts')
      })
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereNotExists((builder) => {
          builder.from('accounts')
        })
      )
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add where not exists clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotExists(connection.client!.from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where not exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereNotExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orWhereNotExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('wrap or where not exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotExists((builder) => {
        builder.from('accounts')
      })
      .wrapExisting()
      .orWhereNotExists((builder) => {
        builder.from('team')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.orWhereNotExists((builder) => {
          builder.from('accounts')
        })
      )
      .orWhere((q) =>
        q.orWhereNotExists((builder) => {
          builder.from('team')
        })
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where not exists clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereNotExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orWhereNotExists(connection.client!.from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereBetween', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereBetween('age', [0, 20]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereBetween('age', [0, 20])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereBetween('age', [18, 20])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereBetween('my_age', [18, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap where between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereBetween('age', [0, 20])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereBetween('age', [0, 20]))
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereBetween('age', [0, 20])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereBetween('my_age', [0, 20]))
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where between clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereBetween('age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereBetween('my_age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').orWhereBetween('age', [18, 20]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orWhereBetween('age', [18, 20])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orWhereBetween('age', [18, 20])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .orWhereBetween('my_age', [18, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap or where between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereBetween('age', [18, 20])
      .orWhereBetween('age', [60, 80])
      .wrapExisting()
      .orWhereNotBetween('age', [24, 28])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereBetween('age', [18, 20]).orWhereBetween('age', [60, 80]))
      .orWhere((q) => q.whereNotBetween('age', [24, 28]))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereBetween('age', [18, 20])
      .orWhereBetween('age', [60, 80])
      .wrapExisting()
      .orWhereNotBetween('age', [24, 28])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereBetween('my_age', [18, 20]).orWhereBetween('my_age', [60, 80]))
      .orWhere((q) => q.whereNotBetween('my_age', [24, 28]))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where between clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orWhereBetween('age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orWhereBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .orWhereBetween('my_age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNotBetween', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where not between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereNotBetween('age', [18, 20]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotBetween('age', [18, 20])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotBetween('age', [18, 20])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotBetween('my_age', [18, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap where not between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotBetween('age', [18, 20])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotBetween('age', [18, 20]))
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotBetween('age', [18, 20])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotBetween('my_age', [18, 20]))
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not between clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNotBetween('age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNotBetween('my_age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where not between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotBetween('age', [18, 20])
      .wrapExisting()
      .orWhereNotBetween('age', [60, 80])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotBetween('age', [18, 20]))
      .orWhere((q) => q.whereNotBetween('age', [60, 80]))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotBetween('age', [18, 20])
      .wrapExisting()
      .orWhereNotBetween('age', [60, 80])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereNotBetween('my_age', [18, 20]))
      .orWhere((q) => q.whereNotBetween('my_age', [60, 80]))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where not between clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereNotBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orWhereNotBetween('age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orWhereNotBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .orWhereNotBetween('my_age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereRaw', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where raw clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereRaw('id = ?', [1]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereRaw('id = ?', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('wrap where raw clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw('id = ?', [1])
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereRaw('id = ?', [1]))
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add where raw clause without bindings', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereRaw('id = 1').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereRaw('id = 1')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add where raw clause with object of bindings', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereRaw('id = :id', { id: 1 }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereRaw('id = :id', { id: 1 })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add where raw clause from a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw(getRawQueryBuilder(getQueryClient(connection), 'select id from accounts;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereRaw(connection.client!.raw('select id from accounts;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where raw clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw('id = ?', [1])
      .orWhereRaw('id = ?', [2])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereRaw('id = ?', [1])
      .orWhereRaw('id = ?', [2])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('wrap or where raw clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw('id = ?', [1])
      .wrapExisting()
      .orWhereRaw('id = ?', [2])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereRaw('id = ?', [1]))
      .orWhere((q) => q.whereRaw('id = ?', [2]))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | join', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add query join', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .join('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query join with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .join('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query join using join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .join('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query join as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join(
        'profiles',
        'profiles.type',
        getRawQueryBuilder(getQueryClient(connection), '?', ['social'])
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .join('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query join as a raw builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', 'profiles.type', getDb().raw('?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .join('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('use onJsonPathEquals method from the join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', (builder) => {
        builder.onJsonPathEquals(
          'country_name', // json column in cities
          '$.country.name', // json path to country name in 'country_name' column
          'description', // json column in country
          '$.name' // json field in 'description' column
        )
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .join('profiles', (builder) => {
        builder.onJsonPathEquals(
          'country_name', // json column in cities
          '$.country.name', // json path to country name in 'country_name' column
          'description', // json column in country
          '$.name' // json field in 'description' column
        )
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | innerJoin', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add query innerJoin', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .innerJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query innerJoin with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .innerJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query innerJoin using join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .innerJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query innerJoin as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin(
        'profiles',
        'profiles.type',
        getRawQueryBuilder(getQueryClient(connection), '?', ['social'])
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .innerJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query innerJoin as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', 'profiles.type', getDb().raw('?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .innerJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | leftJoin', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add query leftJoin', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftJoin with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .leftJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftJoin using join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .leftJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftJoin as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftJoin(
        'profiles',
        'profiles.type',
        getRawQueryBuilder(getQueryClient(connection), '?', ['social'])
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .leftJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | leftOuterJoin', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {})

  test('add query leftOuterJoin', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .leftOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftOuterJoin with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .leftOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftOuterJoin using join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .leftOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftOuterJoin as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftOuterJoin(
        'profiles',
        'profiles.type',
        getRawQueryBuilder(getQueryClient(connection), '?', ['social'])
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .leftOuterJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | rightJoin', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add query rightJoin', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .rightJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightJoin with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .rightJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightJoin using join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .rightJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightJoin as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightJoin(
        'profiles',
        'profiles.type',
        getRawQueryBuilder(getQueryClient(connection), '?', ['social'])
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .rightJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | rightOuterJoin', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add query rightOuterJoin', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .rightOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightOuterJoin with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .rightOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightOuterJoin using join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .rightOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightOuterJoin as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightOuterJoin(
        'profiles',
        'profiles.type',
        getRawQueryBuilder(getQueryClient(connection), '?', ['social'])
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .rightOuterJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | fullOuterJoin', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add query fullOuterJoin', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .fullOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .fullOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query fullOuterJoin with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .fullOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .fullOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query fullOuterJoin using join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .fullOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .fullOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query fullOuterJoin as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .fullOuterJoin(
        'profiles',
        'profiles.type',
        getRawQueryBuilder(getQueryClient(connection), '?', ['social'])
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .fullOuterJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | crossJoin', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add query crossJoin', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .crossJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .crossJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query crossJoin with operator', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .crossJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .crossJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query crossJoin using join callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .crossJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .crossJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query crossJoin as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .crossJoin(
        'profiles',
        'profiles.type',
        getRawQueryBuilder(getQueryClient(connection), '?', ['social'])
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .crossJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | joinRaw', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add join as a raw join', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').joinRaw('natural full join table1').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .joinRaw('natural full join table1')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add join as a raw join by passing the raw query output', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .joinRaw(getRawQueryBuilder(getQueryClient(connection), 'natural full join table1'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .joinRaw('natural full join table1')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | distinct', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define distinct columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').distinct('name', 'age').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .distinct('name', 'age')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .distinct('name', 'age')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .distinct('my_name', 'my_age')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | distinctOn', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  if (process.env.DB === 'pg') {
    test('define distinct columns', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db.from('users').distinctOn('name', 'age').toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .distinctOn('name', 'age')
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .distinctOn('name', 'age')
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from('users')
        .distinctOn('my_name', 'my_age')
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })
  }
})

test.group('Query Builder | groupBy', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define group by columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').groupBy('name', 'age').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .groupBy('name', 'age')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .groupBy('name', 'age')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .groupBy('my_name', 'my_age')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | groupByRaw', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define group by columns as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').groupByRaw('select (age) from user_profiles').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .groupByRaw('select (age) from user_profiles')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | orderBy', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define order by columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').orderBy('name').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orderBy('name')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orderBy('name')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .orderBy('my_name')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define order by columns with explicit direction', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').orderBy('name', 'desc').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orderBy('name', 'desc')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orderBy('name', 'desc')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .orderBy('my_name', 'desc')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define order by columns as an array', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').orderBy('name', 'desc').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orderBy('name', 'desc')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orderBy(['name'])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .orderBy('my_name')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define order by columns as an array of objects', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orderBy([
        { column: 'name', order: 'desc' },
        { column: 'age', order: 'desc' },
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orderBy([
        { column: 'name', order: 'desc' },
        { column: 'age', order: 'desc' },
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orderBy([
        { column: 'name', order: 'desc' },
        { column: 'age', order: 'desc' },
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .orderBy([
        { column: 'my_name', order: 'desc' },
        { column: 'my_age', order: 'desc' },
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define order by columns as subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .orderBy(
        getQueryBuilder(getQueryClient(connection))
          .from('user_logins')
          .where('user_id', '=', getRawQueryBuilder(getQueryClient(connection), 'users.id'))
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orderBy(
        connection
          .client!.from('user_logins')
          .where('user_id', '=', connection.client!.raw('users.id'))
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define order by columns as an array of subqueries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .orderBy([
        {
          column: getQueryBuilder(getQueryClient(connection))
            .from('user_logins')
            .where('user_id', '=', getRawQueryBuilder(getQueryClient(connection), 'users.id')),
          order: 'desc' as const,
        },
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orderBy([
        {
          column: connection
            .client!.from('user_logins')
            .where('user_id', '=', connection.client!.raw('users.id')),
          order: 'desc',
        },
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | orderByRaw', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define order by columns as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').orderByRaw('col DESC NULLS LAST').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orderByRaw('col DESC NULLS LAST')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Query Builder | offset', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define select offset', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').offset(10).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .offset(10)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | limit', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define results limit', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').limit(10).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .limit(10)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | union', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define union query as a callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union((builder) => {
        builder.select('*').from('users').whereNull('first_name')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .union((builder) => {
        builder.select('*').from('users').whereNull('first_name')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union(getQueryBuilder(getQueryClient(connection)).from('users').whereNull('first_name'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .union(connection.client!.from('users').whereNull('first_name'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from users where first_name is null'
        )
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .union(connection.client!.raw('select * from users where first_name is null'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as an array of callbacks', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union([
        (builder) => {
          builder.select('*').from('users').whereNull('first_name')
        },
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .union([
        (builder) => {
          builder.select('*').from('users').whereNull('first_name')
        },
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as an array of subqueries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union([getQueryBuilder(getQueryClient(connection)).from('users').whereNull('first_name')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .union([connection.client!.from('users').whereNull('first_name')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as an array of raw queries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union([
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from users where first_name is null'
        ),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .union([connection.client!.raw('select * from users where first_name is null')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add limit to union set', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection))
      .table('users')
      .multiInsert([
        {
          username: 'virk',
          email: 'virk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        },
        {
          username: 'nikk',
          email: 'nikk@adonisjs.com',
        },
      ])

    await getInsertBuilder(getQueryClient(connection))
      .table('friends')
      .multiInsert([
        {
          username: 'john',
        },
        {
          username: 'joe',
        },
        {
          username: 'virk',
        },
      ])

    const users = await db
      .from((builder) => {
        builder
          .select('username')
          .from('users')
          .as('u')
          .union((unionQuery) => {
            unionQuery.select('username').from('friends')
          })
      })
      .orderBy('u.username')
      .limit(2)

    assert.lengthOf(users, 2)
    assert.equal(users[0].username, 'joe')
    assert.equal(users[1].username, 'john')
    await connection.disconnect()
  })

  test('add limit to union subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection))
      .table('users')
      .multiInsert([
        {
          username: 'virk',
          email: 'virk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        },
        {
          username: 'nikk',
          email: 'nikk@adonisjs.com',
        },
      ])

    await getInsertBuilder(getQueryClient(connection))
      .table('friends')
      .multiInsert([
        {
          username: 'john',
        },
        {
          username: 'joe',
        },
        {
          username: 'virk',
        },
      ])

    const users = await db
      .from((builder) => {
        builder
          .select('username')
          .from('users')
          .as('u')
          .union((unionQuery) => {
            unionQuery.from((fromBuilder) => {
              fromBuilder.select('username').from('friends').as('f').orderBy('id', 'asc').limit(2)
            })
          })
      })
      .orderBy('u.username')

    assert.lengthOf(users, 5)
    assert.equal(users[0].username, 'joe')
    assert.equal(users[1].username, 'john')
    assert.equal(users[2].username, 'nikk')
    assert.equal(users[3].username, 'romain')
    assert.equal(users[4].username, 'virk')
    await connection.disconnect()
  })

  test('count union set', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection))
      .table('users')
      .multiInsert([
        {
          username: 'virk',
          email: 'virk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        },
        {
          username: 'nikk',
          email: 'nikk@adonisjs.com',
        },
      ])

    await getInsertBuilder(getQueryClient(connection))
      .table('friends')
      .multiInsert([
        {
          username: 'john',
        },
        {
          username: 'joe',
        },
        {
          username: 'virk',
        },
      ])

    const users = await db.count('u.username as total').from((builder) => {
      builder
        .select('username')
        .from('users')
        .as('u')
        .union((unionQuery) => {
          unionQuery.select('username').from('friends')
        })
    })

    assert.equal(users[0].total, 5)
    await connection.disconnect()
  })

  test('count union set with limit on subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection))
      .table('users')
      .multiInsert([
        {
          username: 'virk',
          email: 'virk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        },
        {
          username: 'nikk',
          email: 'nikk@adonisjs.com',
        },
      ])

    await getInsertBuilder(getQueryClient(connection))
      .table('friends')
      .multiInsert([
        {
          username: 'john',
        },
        {
          username: 'joe',
        },
        {
          username: 'virk',
        },
      ])

    const users = await db.count('f.username as total').from((builder) => {
      builder
        .select('username')
        .from('friends')
        .as('f')
        .union((unionQuery) => {
          unionQuery.from((fromBuilder) => {
            fromBuilder.select('username').from('users').as('u').orderBy('id', 'asc').limit(2)
          })
        })
    })

    assert.equal(users[0].total, 4)
    await connection.disconnect()
  })
})

test.group('Query Builder | unionAll', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define unionAll query as a callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll((builder) => {
        builder.select('*').from('users').whereNull('first_name')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .unionAll((builder) => {
        builder.select('*').from('users').whereNull('first_name')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll(getQueryBuilder(getQueryClient(connection)).from('users').whereNull('first_name'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .unionAll(connection.client!.from('users').whereNull('first_name'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from users where first_name is null'
        )
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .unionAll(connection.client!.raw('select * from users where first_name is null'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as an array of callbacks', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll([
        (builder) => {
          builder.select('*').from('users').whereNull('first_name')
        },
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .unionAll([
        (builder) => {
          builder.select('*').from('users').whereNull('first_name')
        },
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as an array of subqueries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll([getQueryBuilder(getQueryClient(connection)).from('users').whereNull('first_name')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .unionAll([connection.client!.from('users').whereNull('first_name')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as an array of raw queries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll([
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from users where first_name is null'
        ),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .unionAll([connection.client!.raw('select * from users where first_name is null')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Query Builder | forUpdate', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define FOR UPDATE lock', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').forUpdate().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .forUpdate()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define FOR UPDATE lock with additional tables (pg only)', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').forUpdate('profiles').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .forUpdate('profiles')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | forShare', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define FOR SHARE lock', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').forShare().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .forShare()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define FOR SHARE lock with additional tables (pg only)', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').forShare('profiles').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .forShare('profiles')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

if (['pg', 'mysql'].includes(process.env.DB!)) {
  test.group('Query Builder | noWait', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('add no wait instruction to the query', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db.from('users').forShare().noWait().toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .forShare()
        .noWait()
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })
  })

  test.group('Query Builder | skipLocked', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    test('add skip locked instruction to the query', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db.from('users').forShare().skipLocked().toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .forShare()
        .skipLocked()
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })
  })
}

test.group('Query Builder | having', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').having('count', '>', 10).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having('count', '>', 10)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .having('count', '>', 10)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .having('my_count', '>', 10)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having clause as a callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having((builder) => {
        builder.where('id', '>', 10)
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having((builder) => {
        builder.where('id', '>', 10)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .having((builder) => {
        builder.where('id', '>', 10)
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .having((builder) => {
        builder.where('my_id', '>', 10)
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having clause value being a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    const ref = connection.client!.ref.bind(connection.client!)

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having(
        'user_id',
        '=',
        getRawQueryBuilder(
          getQueryClient(connection),
          `(select ${ref('user_id')} from ${ref('accounts')})`
        )
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having(
        'user_id',
        '=',
        connection.client!.raw(`(select ${ref('user_id')} from ${ref('accounts')})`)
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .having(
        'user_id',
        '=',
        getRawQueryBuilder(
          getQueryClient(connection),
          `(select ${ref('user_id')} from ${ref('accounts')})`
        )
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .having(
        'my_user_id',
        '=',
        connection.client!.raw(`(select ${ref('user_id')} from ${ref('accounts')})`)
      )
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having clause value being a sub query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having(
        'user_id',
        '=',
        getQueryBuilder(getQueryClient(connection)).from('accounts').select('id')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having('user_id', '=', connection.client!.select('id').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .having(
        'user_id',
        '=',
        getQueryBuilder(getQueryClient(connection)).from('accounts').select('id')
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .having('my_user_id', '=', connection.client!.select('id').from('accounts'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db
      .from('users')
      .having(getRawQueryBuilder(getQueryClient(connection), 'id > ?', [4]))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having(connection.client!.raw('id > ?', [4]))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw(getRawQueryBuilder(getQueryClient(connection), 'sum(likes) > ?', [200]))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having(connection.client!.raw('sum(likes) > ?', [200]))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having clause as a raw builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw(getDb().raw('sum(likes) > ?', [200]))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having(connection.client!.raw('sum(likes) > ?', [200]))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or having clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having('count', '>', 10)
      .orHaving('total', '>', 10)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having('count', '>', 10)
      .orHaving('total', '>', 10)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .having('count', '>', 10)
      .orHaving('total', '>', 10)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .having('my_count', '>', 10)
      .orHaving('my_total', '>', 10)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingIn', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having in clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingIn('id', [10, 20]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingIn('id', [10, 20])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingIn('id', [10, 20])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingIn('my_id', [10, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as subqueries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingIn('id', [getQueryBuilder(getQueryClient(connection)).select('id').from('accounts')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingIn('id', [connection.client!.select('id').from('accounts') as any])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingIn('id', [getQueryBuilder(getQueryClient(connection)).select('id').from('accounts')])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingIn('my_id', [connection.client!.select('id').from('accounts') as any])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as raw queries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingIn('id', [getRawQueryBuilder(getQueryClient(connection), 'select id from accounts')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingIn('id', [connection.client!.raw('select id from accounts')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingIn('id', [getRawQueryBuilder(getQueryClient(connection), 'select id from accounts')])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingIn('my_id', [connection.client!.raw('select id from accounts')])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as query callbacks', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const fn = (builder: any) => {
      builder.select('id').from('accounts')
    }

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingIn('id', fn).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingIn('id', fn as any)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingIn('id', fn)
      .toSQL()

    const fnKnex = (builder: any) => {
      builder.select('my_id').from('accounts')
    }
    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingIn('my_id', fnKnex as any)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having in clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingIn('id', [10, 20])
      .orHavingIn('id', [10, 30])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      .havingIn('id', [10, 20])
      ['orHavingIn']('id', [10, 30])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingIn('id', [10, 20])
      .orHavingIn('id', [10, 30])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = (connection.client as any)
      .from('users')
      .havingIn('my_id', [10, 20])
      ['orHavingIn']('my_id', [10, 30])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingNotIn', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add not having in clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingNotIn('id', [10, 20]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      ['havingNotIn']('id', [10, 20])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotIn('id', [10, 20])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      ['havingNotIn']('my_id', [10, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as subqueries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotIn('id', [
        getQueryBuilder(getQueryClient(connection)).select('id').from('accounts'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      ['havingNotIn']('id', [connection.client!.select('id').from('accounts') as any])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotIn('id', [
        getQueryBuilder(getQueryClient(connection)).select('id').from('accounts'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      ['havingNotIn']('my_id', [connection.client!.select('id').from('accounts') as any])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as raw queries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotIn('id', [
        getRawQueryBuilder(getQueryClient(connection), 'select id from accounts'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      ['havingNotIn']('id', [connection.client!.raw('select id from accounts')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotIn('id', [
        getRawQueryBuilder(getQueryClient(connection), 'select id from accounts'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      ['havingNotIn']('my_id', [connection.client!.raw('select id from accounts')])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as query callbacks', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const fn = (builder: any) => {
      builder.select('id').from('accounts')
    }

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingNotIn('id', fn).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      ['havingNotIn']('id', fn as any)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotIn('id', fn)
      .toSQL()

    const fnKnex = (builder: any) => {
      builder.select('my_id').from('accounts')
    }

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      ['havingNotIn']('my_id', fnKnex as any)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having in clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotIn('id', [10, 20])
      .orHavingNotIn('id', [10, 30])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      ['havingNotIn']('id', [10, 20])
      ['orHavingNotIn']('id', [10, 30])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotIn('id', [10, 20])
      .orHavingNotIn('id', [10, 30])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      ['havingNotIn']('my_id', [10, 20])
      ['orHavingNotIn']('my_id', [10, 30])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | havingNull', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingNull('deleted_at').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      ['havingNull']('deleted_at')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      ['havingNull']('my_deleted_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNull('deleted_at')
      .orHavingNull('updated_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      ['havingNull']('deleted_at')
      .orHavingNull('updated_at')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNull('deleted_at')
      .orHavingNull('updated_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = (connection.client as any)
      .from('users')
      ['havingNull']('my_deleted_at')
      .orHavingNull('my_updated_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingNotNull', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingNotNull('deleted_at').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      ['havingNotNull']('deleted_at')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      ['havingNotNull']('my_deleted_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having not null clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotNull('deleted_at')
      .orHavingNotNull('updated_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      .from('users')
      ['havingNotNull']('deleted_at')
      .orHavingNotNull('updated_at')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotNull('deleted_at')
      .orHavingNotNull('updated_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = (connection.client as any)
      .from('users')
      ['havingNotNull']('my_deleted_at')
      .orHavingNotNull('my_updated_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingExists', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingExists((builder) => {
        builder.select('*').from('accounts').whereRaw('users.account_id = accounts.id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      ['havingExists']((builder: any) => {
        builder.select('*').from('accounts').whereRaw('users.account_id = accounts.id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add having exists clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingExists(getQueryBuilder(getQueryClient(connection)).select('*').from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      ['havingExists'](connection.client!.select('*').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or having exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingExists((builder) => {
        builder.select('*').from('accounts')
      })
      .orHavingExists((builder) => {
        builder.select('*').from('profiles')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      ['havingExists']((builder: any) => {
        builder.select('*').from('accounts')
      })
      .orHavingExists((builder: any) => {
        builder.select('*').from('profiles')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingNotExists', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having not exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotExists((builder) => {
        builder.select('*').from('accounts').whereRaw('users.account_id = accounts.id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      ['havingNotExists']((builder: any) => {
        builder.select('*').from('accounts').whereRaw('users.account_id = accounts.id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having not exists clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotExists(getQueryBuilder(getQueryClient(connection)).select('*').from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      ['havingNotExists'](connection.client!.select('*').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or having not exists clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotExists((builder) => {
        builder.select('*').from('accounts')
      })
      .orHavingNotExists((builder) => {
        builder.select('*').from('profiles')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = (connection.client as any)
      .from('users')
      ['havingNotExists']((builder: any) => {
        builder.select('*').from('accounts')
      })
      .orHavingNotExists((builder: any) => {
        builder.select('*').from('profiles')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingBetween', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingBetween('id', [5, 10]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingBetween('id', [5, 10])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingBetween('id', [5, 10])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingBetween('my_id', [5, 10])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having between clause with raw values', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingBetween('id', [
        getRawQueryBuilder(getQueryClient(connection), 'select min(id) from users;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max(id) from users;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingBetween('id', [
        connection.client!.raw('select min(id) from users;'),
        connection.client!.raw('select max(id) from users;'),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingBetween('id', [
        getRawQueryBuilder(getQueryClient(connection), 'select min(id) from users;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max(id) from users;'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingBetween('my_id', [
        connection.client!.raw('select min(id) from users;'),
        connection.client!.raw('select max(id) from users;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having between clause with subqueries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingBetween('id', [
        getQueryBuilder(getQueryClient(connection)).select('id'),
        getQueryBuilder(getQueryClient(connection)).select('id'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingBetween('id', [
        connection.client!.select('id') as any,
        connection.client!.select('id') as any,
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingBetween('id', [
        getQueryBuilder(getQueryClient(connection)).select('id'),
        getQueryBuilder(getQueryClient(connection)).select('id'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingBetween('my_id', [
        connection.client!.select('id') as any,
        connection.client!.select('id') as any,
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingBetween('id', [5, 10])
      .orHavingBetween('id', [18, 23])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingBetween('id', [5, 10])
      .orHavingBetween('id', [18, 23])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingBetween('id', [5, 10])
      .orHavingBetween('id', [18, 23])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingBetween('my_id', [5, 10])
      .orHavingBetween('my_id', [18, 23])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingNotBetween', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having not between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingNotBetween('id', [5, 10]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingNotBetween('id', [5, 10])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotBetween('id', [5, 10])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingNotBetween('my_id', [5, 10])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having not between clause with raw values', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotBetween('id', [
        getRawQueryBuilder(getQueryClient(connection), 'select min(id) from users;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max(id) from users;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingNotBetween('id', [
        connection.client!.raw('select min(id) from users;'),
        connection.client!.raw('select max(id) from users;'),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotBetween('id', [
        getRawQueryBuilder(getQueryClient(connection), 'select min(id) from users;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max(id) from users;'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingNotBetween('my_id', [
        connection.client!.raw('select min(id) from users;'),
        connection.client!.raw('select max(id) from users;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having not between clause with subqueries', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotBetween('id', [
        getQueryBuilder(getQueryClient(connection)).select('id'),
        getQueryBuilder(getQueryClient(connection)).select('id'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingNotBetween('id', [
        connection.client!.select('id') as any,
        connection.client!.select('id') as any,
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotBetween('id', [
        getQueryBuilder(getQueryClient(connection)).select('id'),
        getQueryBuilder(getQueryClient(connection)).select('id'),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingNotBetween('my_id', [
        connection.client!.select('id') as any,
        connection.client!.select('id') as any,
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having not between clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotBetween('id', [5, 10])
      .orHavingNotBetween('id', [18, 23])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingNotBetween('id', [5, 10])
      .orHavingNotBetween('id', [18, 23])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotBetween('id', [5, 10])
      .orHavingNotBetween('id', [18, 23])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .havingNotBetween('my_id', [5, 10])
      .orHavingNotBetween('my_id', [18, 23])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingRaw', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add having raw clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingRaw('id = ?', [1]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingRaw('id = ?', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having raw clause without bindings', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingRaw('id = 1').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingRaw('id = 1')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add having raw clause with object of bindings', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').havingRaw('id = :id', { id: 1 }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingRaw('id = :id', { id: 1 })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having raw clause from a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw(getRawQueryBuilder(getQueryClient(connection), 'select id from accounts;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingRaw(connection.client!.raw('select id from accounts;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or having raw clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw('id = ?', [1])
      .orHavingRaw('id = ?', [2])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .havingRaw('id = ?', [1])
      .orHavingRaw('id = ?', [2])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearSelect', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clear selected columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select('id', 'username').clearSelect().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .select('id', 'username')
      .clearSelect()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearWhere', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clear where clauses', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').where('username', 'virk').clearWhere().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('username', 'virk')
      .clearWhere()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearOrder', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clear order by columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').orderBy('id', 'desc').clearOrder().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .orderBy('id', 'desc')
      .clearOrder()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearHaving', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clear having clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').having('id', '>', 10).clearHaving().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .having('id', '>', 10)
      .clearHaving()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearLimit', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clear limit', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').limit(10).clearLimit().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!.from('users').toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearOffset', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clear offset', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').offset(1).clearOffset().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!.from('users').toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | count', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('count all rows', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').count('*', 'total').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .count('*', { as: 'total' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .count('*', 'total')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .count('*', { as: 'total' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count multiple rows', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').count({ u: 'username', e: 'email' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .count({ u: 'username', e: 'email' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .count({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .count({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .count({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .count(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .count({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .count({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .count(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .count({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by raw query on multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .count({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .count({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .count({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by subquery on multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .count({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .count({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .count({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | countDistinct', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('count all rows', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').countDistinct('*', 'total').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .countDistinct('*', { as: 'total' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .countDistinct('*', 'total')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .countDistinct('*', { as: 'total' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count multiple rows', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').countDistinct({ u: 'username', e: 'email' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .countDistinct({ u: 'username', e: 'email' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .countDistinct({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .countDistinct({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .countDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .countDistinct(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .countDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .countDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .countDistinct(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .countDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by raw query on multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .countDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .countDistinct({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .countDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by subquery on multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .countDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .countDistinct({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .countDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | min', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('use min function', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').min('*', 'smallest').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .min('*', { as: 'smallest' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .min('*', 'smallest')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .min('*', { as: 'smallest' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use min function for multiple times', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').min({ u: 'username', e: 'email' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .min({ u: 'username', e: 'email' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .min({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .min({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute min', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .min({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .min(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .min({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute min', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .min({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .min(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .min({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute min with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .min({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .min({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .min({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute min with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .min({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .min({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .min({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | max', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('use max function', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').max('*', 'biggest').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .max('*', { as: 'biggest' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .max('*', 'biggest')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .max('*', { as: 'biggest' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use max function for multiple times', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').max({ u: 'username', e: 'email' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .max({ u: 'username', e: 'email' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .max({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .max({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute max', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .max({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .max(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .max({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute max', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .max({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .max(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .max({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute max with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .max({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .max({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .max({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute max with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .max({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .max({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .max({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | sum', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('use sum function', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').sum('*', 'total').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sum('*', { as: 'total' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sum('*', 'total')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sum('*', { as: 'total' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use sum function for multiple times', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').sum({ u: 'username', e: 'email' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sum({ u: 'username', e: 'email' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sum({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sum({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute sum', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sum({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sum(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sum({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute sum', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sum({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sum(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sum({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute sum with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sum({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sum({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sum({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute sum with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sum({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sum({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sum({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | sumDistinct', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('use sumDistinct function', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').sumDistinct('*', 'sumDistinct').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sumDistinct('*', { as: 'sumDistinct' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sumDistinct('*', 'sumDistinct')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sumDistinct('*', { as: 'sumDistinct' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use sumDistinct function for multiple times', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').sumDistinct({ u: 'username', e: 'email' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sumDistinct({ u: 'username', e: 'email' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sumDistinct({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sumDistinct({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute sumDistinct', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sumDistinct(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sumDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sumDistinct(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sumDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute sumDistinct', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sumDistinct(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sumDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sumDistinct(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sumDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute sumDistinct with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sumDistinct({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sumDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sumDistinct({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sumDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute sumDistinct with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sumDistinct({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .sumDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .sumDistinct({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .sumDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | avg', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('use avg function', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').avg('*', 'avg').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avg('*', { as: 'avg' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avg('*', 'avg')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avg('*', { as: 'avg' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use avg function for multiple fields', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').avg({ u: 'username', e: 'email' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avg({ u: 'username', e: 'email' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avg({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avg({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute avg', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avg({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avg(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avg({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute avg', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avg({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avg(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avg({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute avg with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avg({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avg({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avg({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute avg with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avg({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avg({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avg({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | avgDistinct', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('use avgDistinct function', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').avgDistinct('*', 'avgDistinct').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avgDistinct('*', { as: 'avgDistinct' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avgDistinct('*', 'avgDistinct')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avgDistinct('*', { as: 'avgDistinct' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use avgDistinct function for multiple times', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').avgDistinct({ u: 'username', e: 'email' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avgDistinct({ u: 'username', e: 'email' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avgDistinct({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avgDistinct({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute avgDistinct', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avgDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avgDistinct(
        getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avgDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute avgDistinct', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avgDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avgDistinct(
        getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        'u'
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avgDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute avgDistinct with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avgDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avgDistinct({
        u: getRawQueryBuilder(
          getQueryClient(connection),
          'select * from profiles where is_verified = ?',
          [true]
        ),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avgDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute avgDistinct with multiple columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .avgDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .avgDistinct({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .avgDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | paginate', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('paginate through rows', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(getUsers(18))

    const users = await db.from('users').paginate(1, 5)
    users.baseUrl('/users')

    assert.lengthOf(users.all(), 5)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isTrue(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)

    assert.deepEqual(users.getMeta(), {
      total: 18,
      perPage: 5,
      currentPage: 1,
      lastPage: 4,
      firstPage: 1,
      firstPageUrl: '/users?page=1',
      lastPageUrl: '/users?page=4',
      nextPageUrl: '/users?page=2',
      previousPageUrl: null,
    })

    await connection.disconnect()
  })

  test('paginate through rows and select columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(getUsers(18))

    const users = await db.from('users').select('username').paginate(1, 5)
    users.baseUrl('/users')

    assert.lengthOf(users.all(), 5)
    assert.notProperty(users.all()[0], 'id')
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isTrue(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)
    assert.deepEqual(users.getMeta(), {
      total: 18,
      perPage: 5,
      currentPage: 1,
      lastPage: 4,
      firstPage: 1,
      firstPageUrl: '/users?page=1',
      lastPageUrl: '/users?page=4',
      nextPageUrl: '/users?page=2',
      previousPageUrl: null,
    })

    await connection.disconnect()
  })

  test('paginate through rows when there is orderBy clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(getUsers(18))

    const users = await db.from('users').orderBy('username').paginate(1, 5)
    users.baseUrl('/users')

    assert.lengthOf(users.all(), 5)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isTrue(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)
    assert.deepEqual(users.getMeta(), {
      total: 18,
      perPage: 5,
      currentPage: 1,
      lastPage: 4,
      firstPage: 1,
      firstPageUrl: '/users?page=1',
      lastPageUrl: '/users?page=4',
      nextPageUrl: '/users?page=2',
      previousPageUrl: null,
    })

    await connection.disconnect()
  })

  test('paginate through rows for the last page', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(getUsers(18))

    const users = await db.from('users').orderBy('username').paginate(4, 5)
    users.baseUrl('/users')

    assert.lengthOf(users.all(), 3)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 4)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isFalse(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)

    assert.deepEqual(users.getMeta(), {
      total: 18,
      perPage: 5,
      currentPage: 4,
      lastPage: 4,
      firstPage: 1,
      firstPageUrl: '/users?page=1',
      lastPageUrl: '/users?page=4',
      nextPageUrl: null,
      previousPageUrl: '/users?page=3',
    })

    await connection.disconnect()
  })

  test('paginate through rows with group by clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(getUsers(18))

    const users = await db
      .from('users')
      .select('username')
      .orderBy('username')
      .groupBy('username')
      .paginate(1, 5)

    users.baseUrl('/users')

    assert.lengthOf(users.all(), 5)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isTrue(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)
    assert.deepEqual(users.getMeta(), {
      total: 18,
      perPage: 5,
      currentPage: 1,
      lastPage: 4,
      firstPage: 1,
      firstPageUrl: '/users?page=1',
      lastPageUrl: '/users?page=4',
      nextPageUrl: '/users?page=2',
      previousPageUrl: null,
    })

    await connection.disconnect()
  })

  test('paginate through rows with select distinct', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    let usersToInsert = getUsers(18).map((user, index) => {
      return {
        ...user,
        country_id: index % 2, // 0 or 1 as dummy country_id
      }
    })

    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(usersToInsert)

    const query = db.from('users').distinct('users.country_id').joinRaw('cross join users u2')

    const results = await query.paginate(1, 1)
    results.baseUrl('/users-country-ids')
    assert.lengthOf(results.all(), 1)
    assert.equal(results.perPage, 1)
    assert.equal(results.currentPage, 1)
    assert.equal(results.lastPage, 2)
    assert.isTrue(results.hasPages)
    assert.isTrue(results.hasMorePages)
    assert.isFalse(results.isEmpty)
    assert.equal(results.total, 2)
    assert.isTrue(results.hasTotal)
    assert.deepEqual(results.getMeta(), {
      total: 2,
      perPage: 1,
      currentPage: 1,
      lastPage: 2,
      firstPage: 1,
      firstPageUrl: '/users-country-ids?page=1',
      lastPageUrl: '/users-country-ids?page=2',
      nextPageUrl: '/users-country-ids?page=2',
      previousPageUrl: null,
    })

    await connection.disconnect()
  })

  test('generate range of pagination urls', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(getUsers(18))

    const users = await db.from('users').paginate(1, 5)
    users.baseUrl('/users')

    assert.deepEqual(users.getUrlsForRange(1, 4), [
      {
        url: '/users?page=1',
        page: 1,
        isActive: true,
      },
      {
        url: '/users?page=2',
        page: 2,
        isActive: false,
      },
      {
        url: '/users?page=3',
        page: 3,
        isActive: false,
      },
      {
        url: '/users?page=4',
        page: 4,
        isActive: false,
      },
    ])

    await connection.disconnect()
  })

  test('loop over pagination rows', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(getUsers(18))

    const users = await db.from('users').paginate(1, 5)
    users.forEach((user) => {
      assert.property(user, 'id')
    })

    await connection.disconnect()
  })

  test('use custom strategy for pagination keys', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(getUsers(18))

    const users = await db.from('users').paginate(1, 5)
    users.baseUrl('/users')

    users.namingStrategy = {
      paginationMetaKeys() {
        return {
          total: 'total',
          perPage: 'perPage',
          currentPage: 'currentPage',
          lastPage: 'lastPage',
          firstPage: 'firstPage',
          firstPageUrl: 'firstPageUrl',
          lastPageUrl: 'lastPageUrl',
          nextPageUrl: 'nextPageUrl',
          previousPageUrl: 'previousPageUrl',
        }
      },
    }

    assert.lengthOf(users.all(), 5)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isTrue(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)

    assert.deepEqual(users.getMeta(), {
      total: 18,
      perPage: 5,
      currentPage: 1,
      lastPage: 4,
      firstPage: 1,
      firstPageUrl: '/users?page=1',
      lastPageUrl: '/users?page=4',
      nextPageUrl: '/users?page=2',
      previousPageUrl: null,
    })

    await connection.disconnect()
  })

  test('use table aliases', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const usersList = getUsers(18)
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert(usersList)

    const users = await db
      .from({ u: 'users' })
      .where('u.username', usersList[0].username)
      .paginate(1, 5)

    users.baseUrl('/users')

    assert.lengthOf(users.all(), 1)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 1)
    assert.isFalse(users.hasPages)
    assert.isFalse(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 1)
    assert.isTrue(users.hasTotal)

    assert.deepEqual(users.getMeta(), {
      total: 1,
      perPage: 5,
      currentPage: 1,
      lastPage: 1,
      firstPage: 1,
      firstPageUrl: '/users?page=1',
      lastPageUrl: '/users?page=1',
      nextPageUrl: null,
      previousPageUrl: null,
    })

    await connection.disconnect()
  })
})

test.group('Query Builder | clone', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('clone query builder', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))

    const clonedQuery = db.from('users').clone()
    assert.deepEqual(clonedQuery, db)
    await connection.disconnect()
  })

  test('clone query builder with where clauses', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db.from('users').where('username', 'virk').clone().toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('deep clone where clauses', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))

    const query = db.from('users').where('username', 'virk')
    const { sql, bindings } = query.clone().orWhere('username', 'romain').toSQL()
    const { sql: orginalSql, bindings: originalBindings } = query.toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('username', 'virk')
      .orWhere('username', 'romain')
      .toSQL()

    const { sql: originalKnexSql, bindings: originalKnexBindings } = connection
      .client!.from('users')
      .where('username', 'virk')
      .toSQL()

    assert.equal(orginalSql, originalKnexSql)
    assert.deepEqual(originalBindings, originalKnexBindings)

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('copy internals to the cloned query builder', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))

    const clonedQuery = db.from('users').groupBy('id').clone()
    assert.isTrue(clonedQuery.hasGroupBy)
    await connection.disconnect()
  })
})

test.group('Query Builder | event', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('emit db:query event when debug globally enabled', async ({ assert }, done) => {
    assert.plan(4)

    const config = Object.assign({}, getConfig(), { debug: true })
    const emitter = createEmitter()

    const connection = new Connection('primary', config, logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection, emitter, 'dual'))
    emitter.on('db:query', (query) => {
      assert.property(query, 'sql')
      assert.property(query, 'inTransaction')
      assert.property(query, 'duration')
      assert.equal(query.connection, 'primary')
      done()
    })

    await db.select('*').from('users')
    await connection.disconnect()
  }).waitForDone()

  test('do not emit db:query event when debug not enabled', async () => {
    const config = Object.assign({}, getConfig(), { debug: false })
    const emitter = createEmitter()

    const connection = new Connection('primary', config, logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection, emitter, 'dual'))
    emitter.on('db:query', () => {
      throw new Error('Never expected to reach here')
    })

    await db.select('*').from('users')
    await connection.disconnect()
  })

  test('emit db:query event when enabled on a single query', async ({ assert }, done) => {
    const config = Object.assign({}, getConfig(), { debug: false })
    const emitter = createEmitter()

    const connection = new Connection('primary', config, logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection, emitter, 'dual'))
    emitter.on('db:query', (query) => {
      assert.property(query, 'sql')
      assert.property(query, 'inTransaction')
      assert.property(query, 'duration')
      assert.equal(query.connection, 'primary')
      done()
    })

    await db.select('*').from('users').debug(true)
    await connection.disconnect()
  }).waitForDone()
})

test.group('Query Builder | update', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('update columns by defining object', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').update({ account_status: 'active' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .update({ account_status: 'active' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .update({ account_status: 'active' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .update({ my_account_status: 'active' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('update columns by defining key-value pair', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').update('account_status', 'active').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .update('account_status', 'active')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .update('account_status', 'active')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .update('my_account_status', 'active')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('handle use case where update value is false or 0', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').update('account_status', 0).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .update('account_status', 0)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .update('is_active', false)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .update('my_is_active', false)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereColumn', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where clause on another column', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereColumn('account_id', 'user_accounts.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereColumn('account_id', 'user_accounts.user_id')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where('my_account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add or where clause on another column', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereColumn('account_id', 'user_accounts.user_id')
      .orWhereColumn('parent_account_id', 'user_accounts.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('account_id', connection.client!.ref('user_accounts.user_id'))
      .orWhere('parent_account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereColumn('account_id', 'user_accounts.user_id')
      .orWhereColumn('parent_account_id', 'user_accounts.user_id')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where('my_account_id', connection.client!.ref('user_accounts.user_id'))
      .orWhere('my_parent_account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where not clause on another column', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotColumn('account_id', 'user_accounts.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotColumn('account_id', 'user_accounts.user_id')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot('my_account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add or where not clause on another column', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotColumn('account_id', 'user_accounts.user_id')
      .orWhereNotColumn('account_id', 'user_accounts.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('account_id', connection.client!.ref('user_accounts.user_id'))
      .orWhereNot('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotColumn('account_id', 'user_accounts.user_id')
      .orWhereNotColumn('account_id', 'user_accounts.user_id')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereNot('my_account_id', connection.client!.ref('user_accounts.user_id'))
      .orWhereNot('my_account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | conditionals', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add constraints to query using if condition', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .if(true, (query) => {
        query.whereColumn('account_id', 'user_accounts.user_id')
      })
      .if(false, (query) => {
        query.whereNotColumn('account_id', 'user_accounts.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define else block for the if condition', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .if(
        false,
        (query) => {
          query.whereColumn('account_id', 'user_accounts.user_id')
        },
        (query) => {
          query.whereNotColumn('account_id', 'user_accounts.user_id')
        }
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add constraints to query using unless condition', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unless(true, (query) => {
        query.whereColumn('account_id', 'user_accounts.user_id')
      })
      .unless(false, (query) => {
        query.whereNotColumn('account_id', 'user_accounts.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define else block for the unless condition', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unless(
        true,
        (query) => {
          query.whereColumn('account_id', 'user_accounts.user_id')
        },
        (query) => {
          query.whereNotColumn('account_id', 'user_accounts.user_id')
        }
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('invoke conditional function to find the conditional value', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unless(
        () => true,
        (query) => {
          query.whereColumn('account_id', 'user_accounts.user_id')
        }
      )
      .unless(
        () => false,
        (query) => {
          query.whereNotColumn('account_id', 'user_accounts.user_id')
        }
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define a match block with no else statement', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .match(
        [true, (query) => query.whereColumn('account_id', 'user_accounts.user_id')],
        [false, (query) => query.whereNotColumn('account_id', 'user_accounts.user_id')]
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define match conditionals as functions', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .match(
        [() => true, (query) => query.whereColumn('account_id', 'user_accounts.user_id')],
        [() => false, (query) => query.whereNotColumn('account_id', 'user_accounts.user_id')]
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('use the first matching block', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .match(
        [true, (query) => query.whereColumn('account_id', 'user_accounts.user_id')],
        [true, (query) => query.whereNotColumn('account_id', 'user_accounts.user_id')]
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('use the else block when nothing matches', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .match(
        [false, (query) => query.whereColumn('account_id', 'user_accounts.user_id')],
        [false, (query) => query.whereNotColumn('account_id', 'user_accounts.user_id')],
        (query) => query.whereNotColumn('account_id', 'user_accounts.user_id')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereNot('account_id', connection.client!.ref('user_accounts.user_id'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | wrapExisting', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply where clauses only once, when calling toSQL multiple times', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))

    const query = db.from('users').where('username', 'virk')

    const { sql: knexSql } = connection.client!.from('users').where('username', 'virk').toSQL()

    assert.equal(query.toSQL().sql, knexSql)
    assert.equal(query.toSQL().sql, knexSql)
    await connection.disconnect()
  })

  test('allow mutating query where clauses post toSQL call', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))

    const query = db.from('users').where('username', 'virk')
    const knexQuery = connection.client!.from('users').where('username', 'virk')

    assert.equal(query.toSQL().sql, knexQuery.toSQL().sql)
    assert.equal(query.where('age', 30).toSQL().sql, knexQuery.where('age', 30).toSQL().sql)
    await connection.disconnect()
  })
})

test.group('Query Builder | with', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define with clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .with('with_alias', client.raw(`SELECT * FROM "users"`))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .with('with_alias', connection.client!.raw(`SELECT * FROM "users"`))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define with clause as a callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .with('with_alias', (query) => query.select('*').from('users'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .with('with_alias', (query) => query.select('*').from('users'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define with clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .with('with_alias', getQueryBuilder(client).select('*').from('users'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .with('with_alias', connection.client!.from('users').select('*'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define with clause and column list', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .with('with_alias', client.raw(`SELECT * FROM "users"`), ['id'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .with('with_alias', ['id'], connection.client!.raw(`SELECT * FROM "users"`))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | withRecursive', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define with recursive clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .withRecursive('with_alias', client.raw(`SELECT * FROM "users"`))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .withRecursive('with_alias', connection.client!.raw(`SELECT * FROM "users"`))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define with recursive clause as a callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .withRecursive('with_alias', (query) => query.select('*').from('users'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .withRecursive('with_alias', (query) => query.select('*').from('users'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define with recursive clause as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .withRecursive('with_alias', getQueryBuilder(client).select('*').from('users'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .withRecursive('with_alias', connection.client!.from('users').select('*'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define with recursive clause and column list', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = getQueryClient(connection)
    let db = getQueryBuilder(client)

    const { sql, bindings } = db
      .from('users')
      .withRecursive('with_alias', client.raw(`SELECT * FROM "users"`), ['id'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .withRecursive('with_alias', ['id'], connection.client!.raw(`SELECT * FROM "users"`))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

if (['pg', 'sqlite', 'better_sqlite', 'libsql'].includes(process.env.DB!)) {
  test.group('Query Builder | withMaterialized', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('define withMaterialized clause as a raw query', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      let db = getQueryBuilder(client)

      const { sql, bindings } = db
        .from('users')
        .withMaterialized('with_alias', client.raw(`SELECT * FROM "users"`))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withMaterialized('with_alias', connection.client!.raw(`SELECT * FROM "users"`))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define withMaterialized clause as a callback', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      let db = getQueryBuilder(client)

      const { sql, bindings } = db
        .from('users')
        .withMaterialized('with_alias', (query) => query.select('*').from('users'))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withMaterialized('with_alias', (query) => query.select('*').from('users'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define withMaterialized clause as a subquery', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      let db = getQueryBuilder(client)

      const { sql, bindings } = db
        .from('users')
        .withMaterialized('with_alias', getQueryBuilder(client).select('*').from('users'))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withMaterialized('with_alias', connection.client!.from('users').select('*'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define withMaterialized clause and column list', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      let db = getQueryBuilder(client)

      const { sql, bindings } = db
        .from('users')
        .withMaterialized('with_alias', client.raw(`SELECT * FROM "users"`), ['id'])
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withMaterialized('with_alias', ['id'], connection.client!.raw(`SELECT * FROM "users"`))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })
  })

  test.group('Query Builder | withNotMaterialized', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('define withNotMaterialized clause as a raw query', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      let db = getQueryBuilder(client)

      const { sql, bindings } = db
        .from('users')
        .withNotMaterialized('with_alias', client.raw(`SELECT * FROM "users"`))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withNotMaterialized('with_alias', connection.client!.raw(`SELECT * FROM "users"`))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define withNotMaterialized clause as a callback', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      let db = getQueryBuilder(client)

      const { sql, bindings } = db
        .from('users')
        .withNotMaterialized('with_alias', (query) => query.select('*').from('users'))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withNotMaterialized('with_alias', (query) => query.select('*').from('users'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define withNotMaterialized clause as a subquery', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      let db = getQueryBuilder(client)

      const { sql, bindings } = db
        .from('users')
        .withNotMaterialized('with_alias', getQueryBuilder(client).select('*').from('users'))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withNotMaterialized('with_alias', connection.client!.from('users').select('*'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define withNotMaterialized clause and column list', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const client = getQueryClient(connection)
      let db = getQueryBuilder(client)

      const { sql, bindings } = db
        .from('users')
        .withNotMaterialized('with_alias', client.raw(`SELECT * FROM "users"`), ['id'])
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withNotMaterialized('with_alias', ['id'], connection.client!.raw(`SELECT * FROM "users"`))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })
  })
}

test.group('Query Builder | whereLike', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where like clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereLike('username', 'virk').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereLike('username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereLike('username', 'virk')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereLike('my_username', 'virk')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap where like clause to its own group', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereLike('username', 'virk')
      .orWhereLike('email', 'virk')
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereLike('username', 'virk').orWhereLike('email', 'virk'))
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereLike('username', 'virk')
      .orWhereLike('email', 'virk')
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereLike('my_username', 'virk').orWhereLike('my_email', 'virk'))
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where like clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereLike(
        'age',
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereLike('age', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('wrap raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereLike(
        'age',
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;')
      )
      .wrapExisting()
      .whereNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereLike('age', connection.client!.raw('select min_age from ages limit 1;')))
      .where((q) => q.whereNotNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add where like clause as a raw builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereLike('age', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereLike('age', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('wrap raw query builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereLike('age', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereLike('age', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add orWhereLike clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereLike('age', 22).orWhereLike('age', 18).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereLike('age', 22)
      .orWhereLike('age', 18)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereLike('age', 22)
      .orWhereLike('age', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereLike('my_age', 22)
      .orWhereLike('my_age', 18)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhereLike clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereLike('age', 22)
      .wrapExisting()
      .orWhereLike('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereLike('age', 22))
      .orWhere((q) => q.whereLike('age', 18))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereLike('age', 22)
      .wrapExisting()
      .orWhereLike('age', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereLike('my_age', 22))
      .orWhere((q) => q.whereLike('my_age', 18))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereLike clause using ref', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereLike('username', 'virk').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereLike('username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereLike('username', getDb().ref('foo.username'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereLike('my_username', connection.client!.ref('foo.username'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap whereLike clause using ref', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereLike('username', getDb().ref('foo.username'))
      .wrapExisting()
      .orWhereNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereLike('username', connection.client!.ref('foo.username')))
      .orWhere((q) => q.whereNotNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereLike('username', getDb().ref('foo.username'))
      .wrapExisting()
      .orWhereNotNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereLike('my_username', connection.client!.ref('foo.username')))
      .orWhere((q) => q.whereNotNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | whereILike', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add whereILike clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereILike('username', 'virk').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereILike('username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereILike('username', 'virk')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereILike('my_username', 'virk')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap whereILike clause to its own group', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereILike('username', 'virk')
      .orWhereLike('email', 'virk')
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereILike('username', 'virk').orWhereLike('email', 'virk'))
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereILike('username', 'virk')
      .orWhereLike('email', 'virk')
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereILike('my_username', 'virk').orWhereLike('my_email', 'virk'))
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereILike clause as a raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereILike(
        'age',
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereILike('age', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('wrap raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereILike(
        'age',
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;')
      )
      .wrapExisting()
      .whereNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) =>
        q.whereILike('age', connection.client!.raw('select min_age from ages limit 1;'))
      )
      .where((q) => q.whereNotNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add whereILike clause as a raw builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereILike('age', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereILike('age', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('wrap raw query builder query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereILike('age', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereILike('age', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add orWhereILike clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereILike('age', 22).orWhereILike('age', 18).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereILike('age', 22)
      .orWhereILike('age', 18)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereILike('age', 22)
      .orWhereILike('age', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereILike('my_age', 22)
      .orWhereILike('my_age', 18)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhereILike clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereILike('age', 22)
      .wrapExisting()
      .orWhereILike('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereILike('age', 22))
      .orWhere((q) => q.whereILike('age', 18))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereILike('age', 22)
      .wrapExisting()
      .orWhereILike('age', 18)
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereILike('my_age', 22))
      .orWhere((q) => q.whereILike('my_age', 18))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereILike clause using ref', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereILike('username', 'virk').toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .whereILike('username', 'virk')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereILike('username', getDb().ref('foo.username'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .whereILike('my_username', connection.client!.ref('foo.username'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap whereILike clause using ref', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereILike('username', getDb().ref('foo.username'))
      .wrapExisting()
      .orWhereNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .where((q) => q.whereILike('username', connection.client!.ref('foo.username')))
      .orWhere((q) => q.whereNotNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereILike('username', getDb().ref('foo.username'))
      .wrapExisting()
      .orWhereNotNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from('users')
      .where((q) => q.whereILike('my_username', connection.client!.ref('foo.username')))
      .orWhere((q) => q.whereNotNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | whereJson', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where json clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').whereJson('location', { country: 'India' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .whereJsonObject('location', { country: 'India' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereJson('location', { country: 'India' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .whereJsonObject('my_location', { country: 'India' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap where json clause to its own group', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereJson('location', { country: 'India' })
      .orWhereJson('location', { country: 'Brazil' })
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .where((q) =>
        q
          .whereJsonObject('location', { country: 'India' })
          .orWhereJsonObject('location', { country: 'Brazil' })
      )
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereJson('location', { country: 'India' })
      .orWhereJson('location', { country: 'Brazil' })
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .where((q) =>
        q
          .whereJsonObject('my_location', { country: 'India' })
          .orWhereJsonObject('my_location', { country: 'Brazil' })
      )
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add orWhereJson clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereJson('location', { country: 'India' })
      .orWhereJson('location', { country: 'Brazil' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .whereJsonObject('location', { country: 'India' })
      .orWhereJsonObject('location', { country: 'Brazil' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereJson('location', { country: 'India' })
      .orWhereJson('location', { country: 'Brazil' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .whereJsonObject('my_location', { country: 'India' })
      .orWhereJsonObject('my_location', { country: 'Brazil' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhereJson clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereJson('location', { country: 'India' })
      .wrapExisting()
      .orWhereJson('location', { country: 'Brazil' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .where((q) => q.whereJsonObject('location', { country: 'India' }))
      .orWhere((q) => q.whereJsonObject('location', { country: 'Brazil' }))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereJson('location', { country: 'India' })
      .wrapExisting()
      .orWhereJson('location', { country: 'Brazil' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .where((q) => q.whereJsonObject('my_location', { country: 'India' }))
      .orWhere((q) => q.whereJsonObject('my_location', { country: 'Brazil' }))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define whereJson value as a callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereJson('location', (q) => q.from('locations').where('user_id', '1'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .whereJsonObject('location', (q: any) => q.from('locations').where('user_id', '1'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereJson('location', (q) => q.from('locations').where('user_id', '1'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .whereJsonObject('my_location', (q: any) => q.from('locations').where('my_user_id', '1'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define whereJson value as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereJson(
        'location',
        getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .whereJsonObject('location', connection.client!.from('locations').where('user_id', '1'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereJson(
        'location',
        getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .whereJsonObject('my_location', connection.client!.from('locations').where('user_id', '1'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNotJson', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('add where not json clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotJson('location', { country: 'India' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .whereNotJsonObject('location', { country: 'India' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotJson('location', { country: 'India' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .whereNotJsonObject('my_location', { country: 'India' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('wrap where not json clause to its own group', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotJson('location', { country: 'India' })
      .orWhereNotJson('location', { country: 'Brazil' })
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .where((q) =>
        q
          .whereNotJsonObject('location', { country: 'India' })
          .orWhereNotJsonObject('location', { country: 'Brazil' })
      )
      .where((q) => q.whereNull('deleted_at'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    /**
     * Using keys resolver
     */
    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`
    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotJson('location', { country: 'India' })
      .orWhereNotJson('location', { country: 'Brazil' })
      .wrapExisting()
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .where((q) =>
        q
          .whereNotJsonObject('my_location', { country: 'India' })
          .orWhereNotJsonObject('my_location', { country: 'Brazil' })
      )
      .where((q) => q.whereNull('my_deleted_at'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add orWhereNotJson clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotJson('location', { country: 'India' })
      .orWhereNotJson('location', { country: 'Brazil' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .whereNotJsonObject('location', { country: 'India' })
      .orWhereNotJsonObject('location', { country: 'Brazil' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotJson('location', { country: 'India' })
      .orWhereNotJson('location', { country: 'Brazil' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .whereNotJsonObject('my_location', { country: 'India' })
      .orWhereNotJsonObject('my_location', { country: 'Brazil' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('wrap orWhereNotJson clause', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotJson('location', { country: 'India' })
      .wrapExisting()
      .orWhereNotJson('location', { country: 'Brazil' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .where((q) => q.whereNotJsonObject('location', { country: 'India' }))
      .orWhere((q) => q.whereNotJsonObject('location', { country: 'Brazil' }))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotJson('location', { country: 'India' })
      .wrapExisting()
      .orWhereNotJson('location', { country: 'Brazil' })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .where((q) => q.whereNotJsonObject('my_location', { country: 'India' }))
      .orWhere((q) => q.whereNotJsonObject('my_location', { country: 'Brazil' }))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define whereNotJson value as a callback', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotJson('location', (q) => q.from('locations').where('user_id', '1'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .whereNotJsonObject('location', (q: any) => q.from('locations').where('user_id', '1'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotJson('location', (q) => q.from('locations').where('user_id', '1'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .whereNotJsonObject('my_location', (q: any) => q.from('locations').where('my_user_id', '1'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define whereNotJson value as a subquery', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotJson(
        'location',
        getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from<any>('users')
      .whereNotJsonObject('location', connection.client!.from('locations').where('user_id', '1'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotJson(
        'location',
        getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
      .client!.from<any>('users')
      .whereNotJsonObject('my_location', connection.client!.from('locations').where('user_id', '1'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

if (['pg', 'mysql'].includes(process.env.DB!)) {
  test.group('Query Builder | whereJsonSuperset', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('add where json superset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSuperset('location', { country: 'India' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonSupersetOf('location', { country: 'India' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      /**
       * Using keys resolver
       */
      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`
      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSuperset('location', { country: 'India' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonSupersetOf('my_location', { country: 'India' })
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)
      await connection.disconnect()
    })

    test('wrap where json superset clause to its own group', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSuperset('location', { country: 'India' })
        .orWhereJsonSuperset('location', { country: 'Brazil' })
        .wrapExisting()
        .whereNull('deleted_at')
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .where((q) =>
          q
            .whereJsonSupersetOf('location', { country: 'India' })
            .orWhereJsonSupersetOf('location', { country: 'Brazil' })
        )
        .where((q) => q.whereNull('deleted_at'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      /**
       * Using keys resolver
       */
      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`
      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSuperset('location', { country: 'India' })
        .orWhereJsonSuperset('location', { country: 'Brazil' })
        .wrapExisting()
        .whereNull('deleted_at')
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .where((q) =>
          q
            .whereJsonSupersetOf('my_location', { country: 'India' })
            .orWhereJsonSupersetOf('my_location', { country: 'Brazil' })
        )
        .where((q) => q.whereNull('my_deleted_at'))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)
      await connection.disconnect()
    })

    test('add orWhereJsonSuperset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSuperset('location', { country: 'India' })
        .orWhereJsonSuperset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonSupersetOf('location', { country: 'India' })
        .orWhereJsonSupersetOf('location', { country: 'Brazil' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSuperset('location', { country: 'India' })
        .orWhereJsonSuperset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonSupersetOf('my_location', { country: 'India' })
        .orWhereJsonSupersetOf('my_location', { country: 'Brazil' })
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('wrap orWhereJsonSuperset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSuperset('location', { country: 'India' })
        .wrapExisting()
        .orWhereJsonSuperset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .where((q) => q.whereJsonSupersetOf('location', { country: 'India' }))
        .orWhere((q) => q.whereJsonSupersetOf('location', { country: 'Brazil' }))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSuperset('location', { country: 'India' })
        .wrapExisting()
        .orWhereJsonSuperset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .where((q) => q.whereJsonSupersetOf('my_location', { country: 'India' }))
        .orWhere((q) => q.whereJsonSupersetOf('my_location', { country: 'Brazil' }))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('define whereJsonSuperset value as a callback', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSuperset('location', (q) => q.from('locations').where('user_id', '1'))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonSupersetOf('location', (q: any) => q.from('locations').where('user_id', '1'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSuperset('location', (q) => q.from('locations').where('user_id', '1'))
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonSupersetOf('my_location', (q: any) =>
          q.from('locations').where('my_user_id', '1')
        )
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('define whereJsonSuperset value as a subquery', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSuperset(
          'location',
          getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
        )
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonSupersetOf('location', connection.client!.from('locations').where('user_id', '1'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSuperset(
          'location',
          getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
        )
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonSupersetOf(
          'my_location',
          connection.client!.from('locations').where('user_id', '1')
        )
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })
  })

  test.group('Query Builder | whereNotJsonSuperset', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('add where not json superset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSuperset('location', { country: 'India' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSupersetOf('location', { country: 'India' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      /**
       * Using keys resolver
       */
      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`
      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSuperset('location', { country: 'India' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSupersetOf('my_location', { country: 'India' })
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)
      await connection.disconnect()
    })

    test('wrap where not json superset clause to its own group', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSuperset('location', { country: 'India' })
        .orWhereNotJsonSuperset('location', { country: 'Brazil' })
        .wrapExisting()
        .whereNull('deleted_at')
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .where((q) =>
          q
            .whereJsonNotSupersetOf('location', { country: 'India' })
            .orWhereJsonNotSupersetOf('location', { country: 'Brazil' })
        )
        .where((q) => q.whereNull('deleted_at'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      /**
       * Using keys resolver
       */
      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`
      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSuperset('location', { country: 'India' })
        .orWhereNotJsonSuperset('location', { country: 'Brazil' })
        .wrapExisting()
        .whereNull('deleted_at')
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .where((q) =>
          q
            .whereJsonNotSupersetOf('my_location', { country: 'India' })
            .orWhereJsonNotSupersetOf('my_location', { country: 'Brazil' })
        )
        .where((q) => q.whereNull('my_deleted_at'))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)
      await connection.disconnect()
    })

    test('add orWhereNotJsonSuperset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSuperset('location', { country: 'India' })
        .orWhereNotJsonSuperset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSupersetOf('location', { country: 'India' })
        .orWhereJsonNotSupersetOf('location', { country: 'Brazil' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSuperset('location', { country: 'India' })
        .orWhereNotJsonSuperset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSupersetOf('my_location', { country: 'India' })
        .orWhereJsonNotSupersetOf('my_location', { country: 'Brazil' })
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('wrap orWhereNotJsonSuperset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSuperset('location', { country: 'India' })
        .wrapExisting()
        .orWhereNotJsonSuperset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .where((q) => q.whereJsonNotSupersetOf('location', { country: 'India' }))
        .orWhere((q) => q.whereJsonNotSupersetOf('location', { country: 'Brazil' }))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSuperset('location', { country: 'India' })
        .wrapExisting()
        .orWhereNotJsonSuperset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .where((q) => q.whereJsonNotSupersetOf('my_location', { country: 'India' }))
        .orWhere((q) => q.whereJsonNotSupersetOf('my_location', { country: 'Brazil' }))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('define whereNotJsonSuperset value as a callback', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSuperset('location', (q) => q.from('locations').where('user_id', '1'))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSupersetOf('location', (q: any) => q.from('locations').where('user_id', '1'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSuperset('location', (q) => q.from('locations').where('user_id', '1'))
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSupersetOf('my_location', (q: any) =>
          q.from('locations').where('my_user_id', '1')
        )
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('define whereNotJsonSuperset value as a subquery', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSuperset(
          'location',
          getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
        )
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSupersetOf(
          'location',
          connection.client!.from('locations').where('user_id', '1')
        )
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSuperset(
          'location',
          getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
        )
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSupersetOf(
          'my_location',
          connection.client!.from('locations').where('user_id', '1')
        )
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })
  })

  test.group('Query Builder | whereJsonSubset', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('add where json subset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSubset('location', { country: 'India' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonSubsetOf('location', { country: 'India' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      /**
       * Using keys resolver
       */
      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`
      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSubset('location', { country: 'India' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonSubsetOf('my_location', { country: 'India' })
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)
      await connection.disconnect()
    })

    test('wrap where json subset clause to its own group', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSubset('location', { country: 'India' })
        .orWhereJsonSubset('location', { country: 'Brazil' })
        .wrapExisting()
        .whereNull('deleted_at')
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .where((q) =>
          q
            .whereJsonSubsetOf('location', { country: 'India' })
            .orWhereJsonSubsetOf('location', { country: 'Brazil' })
        )
        .where((q) => q.whereNull('deleted_at'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      /**
       * Using keys resolver
       */
      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`
      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSubset('location', { country: 'India' })
        .orWhereJsonSubset('location', { country: 'Brazil' })
        .wrapExisting()
        .whereNull('deleted_at')
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .where((q) =>
          q
            .whereJsonSubsetOf('my_location', { country: 'India' })
            .orWhereJsonSubsetOf('my_location', { country: 'Brazil' })
        )
        .where((q) => q.whereNull('my_deleted_at'))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)
      await connection.disconnect()
    })

    test('add orWhereJsonSubset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSubset('location', { country: 'India' })
        .orWhereJsonSubset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonSubsetOf('location', { country: 'India' })
        .orWhereJsonSubsetOf('location', { country: 'Brazil' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSubset('location', { country: 'India' })
        .orWhereJsonSubset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonSubsetOf('my_location', { country: 'India' })
        .orWhereJsonSubsetOf('my_location', { country: 'Brazil' })
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('wrap orWhereJsonSubset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSubset('location', { country: 'India' })
        .wrapExisting()
        .orWhereJsonSubset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .where((q) => q.whereJsonSubsetOf('location', { country: 'India' }))
        .orWhere((q) => q.whereJsonSubsetOf('location', { country: 'Brazil' }))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSubset('location', { country: 'India' })
        .wrapExisting()
        .orWhereJsonSubset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .where((q) => q.whereJsonSubsetOf('my_location', { country: 'India' }))
        .orWhere((q) => q.whereJsonSubsetOf('my_location', { country: 'Brazil' }))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('define whereJsonSubset value as a callback', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSubset('location', (q) => q.from('locations').where('user_id', '1'))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonSubsetOf('location', (q: any) => q.from('locations').where('user_id', '1'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSubset('location', (q) => q.from('locations').where('user_id', '1'))
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonSubsetOf('my_location', (q: any) => q.from('locations').where('my_user_id', '1'))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('define whereJsonSubset value as a subquery', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereJsonSubset(
          'location',
          getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
        )
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonSubsetOf('location', connection.client!.from('locations').where('user_id', '1'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereJsonSubset(
          'location',
          getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
        )
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonSubsetOf(
          'my_location',
          connection.client!.from('locations').where('user_id', '1')
        )
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })
  })

  test.group('Query Builder | whereNotJsonSubset', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    group.each.teardown(async () => {
      await resetTables()
    })

    test('add where not json subset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSubset('location', { country: 'India' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSubsetOf('location', { country: 'India' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      /**
       * Using keys resolver
       */
      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`
      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSubset('location', { country: 'India' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSubsetOf('my_location', { country: 'India' })
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)
      await connection.disconnect()
    })

    test('wrap where not json Subset clause to its own group', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSubset('location', { country: 'India' })
        .orWhereNotJsonSubset('location', { country: 'Brazil' })
        .wrapExisting()
        .whereNull('deleted_at')
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .where((q) =>
          q
            .whereJsonNotSubsetOf('location', { country: 'India' })
            .orWhereJsonNotSubsetOf('location', { country: 'Brazil' })
        )
        .where((q) => q.whereNull('deleted_at'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      /**
       * Using keys resolver
       */
      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`
      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSubset('location', { country: 'India' })
        .orWhereNotJsonSubset('location', { country: 'Brazil' })
        .wrapExisting()
        .whereNull('deleted_at')
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .where((q) =>
          q
            .whereJsonNotSubsetOf('my_location', { country: 'India' })
            .orWhereJsonNotSubsetOf('my_location', { country: 'Brazil' })
        )
        .where((q) => q.whereNull('my_deleted_at'))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)
      await connection.disconnect()
    })

    test('add orWhereNotJsonSubset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSubset('location', { country: 'India' })
        .orWhereNotJsonSubset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSubsetOf('location', { country: 'India' })
        .orWhereJsonNotSubsetOf('location', { country: 'Brazil' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSubset('location', { country: 'India' })
        .orWhereNotJsonSubset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSubsetOf('my_location', { country: 'India' })
        .orWhereJsonNotSubsetOf('my_location', { country: 'Brazil' })
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('wrap orWhereNotJsonSubset clause', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSubset('location', { country: 'India' })
        .wrapExisting()
        .orWhereNotJsonSubset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .where((q) => q.whereJsonNotSubsetOf('location', { country: 'India' }))
        .orWhere((q) => q.whereJsonNotSubsetOf('location', { country: 'Brazil' }))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSubset('location', { country: 'India' })
        .wrapExisting()
        .orWhereNotJsonSubset('location', { country: 'Brazil' })
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .where((q) => q.whereJsonNotSubsetOf('my_location', { country: 'India' }))
        .orWhere((q) => q.whereJsonNotSubsetOf('my_location', { country: 'Brazil' }))
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('define whereNotJsonSubset value as a callback', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSubset('location', (q) => q.from('locations').where('user_id', '1'))
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSubsetOf('location', (q: any) => q.from('locations').where('user_id', '1'))
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSubset('location', (q) => q.from('locations').where('user_id', '1'))
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSubsetOf('my_location', (q: any) =>
          q.from('locations').where('my_user_id', '1')
        )
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })

    test('define whereNotJsonSubset value as a subquery', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      let db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .whereNotJsonSubset(
          'location',
          getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
        )
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSubsetOf(
          'location',
          connection.client!.from('locations').where('user_id', '1')
        )
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      db = getQueryBuilder(getQueryClient(connection))
      db.keysResolver = (key) => `my_${key}`

      const { sql: resolverSql, bindings: resolverBindings } = db
        .from('users')
        .whereNotJsonSubset(
          'location',
          getQueryBuilder(getQueryClient(connection)).from('locations').where('user_id', '1')
        )
        .toSQL()

      const { sql: knexResolverSql, bindings: knexResolverBindings } = connection
        .client!.from<any>('users')
        .whereJsonNotSubsetOf(
          'my_location',
          connection.client!.from('locations').where('user_id', '1')
        )
        .toSQL()

      assert.equal(resolverSql, knexResolverSql)
      assert.deepEqual(resolverBindings, knexResolverBindings)

      await connection.disconnect()
    })
  })
}
