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
import { Connection } from '../../src/Connection'
import { executeQuery } from '../../src/helpers/executeQuery'
import { DatabaseQueryBuilder } from '../../src/Database/QueryBuilder/Database'
import {
  setup,
  cleanup,
  getDb,
  getConfig,
  getUsers,
  getLogger,
  resetTables,
  getQueryClient,
  getQueryBuilder,
  getInsertBuilder,
  getRawQueryBuilder,
} from '../../test-helpers'

if (process.env.DB !== 'sqlite') {
  test.group('Query Builder | client', (group) => {
    group.before(async () => {
      await setup()
    })

    group.after(async () => {
      await cleanup()
    })

    group.afterEach(async () => {
      await resetTables()
    })

    test('use read client when making select query', async (assert) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getReadClient = function getReadClient () {
        assert.isTrue(true)
        return this.connection.client
      }

      await executeQuery(db.select('*').from('users').knexQuery, client, null)
      await connection.disconnect()
    })

    test('use write client for update', async (assert) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getWriteClient = function getWriteClient () {
        assert.isTrue(true)
        return this.connection.client
      }

      await executeQuery(db.from('users').update('username', 'virk').knexQuery, client, null)
      await connection.disconnect()
    })

    test('use write client for delete', async (assert) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getWriteClient = function getWriteClient () {
        assert.isTrue(true)
        return this.connection.client
      }

      await executeQuery(db.from('users').del().knexQuery, client, null)
      await connection.disconnect()
    })

    test('use write client for inserts', async (assert) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getInsertBuilder(client)

      client.getWriteClient = function getWriteClient () {
        assert.isTrue(true)
        return this.connection.client
      }

      await executeQuery(db.table('users').insert({ username: 'virk' }).knexQuery, client, null)
      await connection.disconnect()
    })

    test('use transaction client when query is used inside a transaction', async () => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getReadClient = function getReadClient () {
        throw new Error('Never expected to reach here')
      }

      const trx = await client.transaction()
      await executeQuery(db.select('*').from('users').useTransaction(trx).knexQuery, client, null)
      await trx.commit()
      await connection.disconnect()
    })

    test('use transaction client when insert query is used inside a transaction', async () => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getInsertBuilder(client)

      client.getReadClient = function getReadClient () {
        throw new Error('Never expected to reach here')
      }

      const trx = await client.transaction()
      await executeQuery(
        db.table('users').useTransaction(trx).insert({ username: 'virk' }).knexQuery,
        client,
        null,
      )
      await trx.rollback()
      await connection.disconnect()
    })

    test('use transaction client when query is issued from transaction client', async () => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)

      client.getReadClient = function getReadClient () {
        throw new Error('Never expected to reach here')
      }

      const trx = await client.transaction()
      await executeQuery(
        trx.query().select('*').from('users').knexQuery,
        client,
        null,
      )
      await trx.commit()
      await connection.disconnect()
    })

    test('use transaction client when insert query is issued from transaction client', async () => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)

      const trx = await client.transaction()
      trx.getReadClient = function getReadClient () {
        throw new Error('Never expected to reach here')
      }

      await executeQuery(
        trx.insertQuery().table('users').insert({ username: 'virk' }).knexQuery,
        trx,
        null,
      )
      await trx.commit()
    })
  })
}

test.group('Query Builder | from', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define query table', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!.from('users').toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define table alias', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from({ u: 'users' }).toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!.from({ u: 'users' }).toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Query Builder | select', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define columns as array', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select(['username']).toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .select('username')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns with aliases', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select(['username as u']).toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .select('username as u')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as multiple arguments', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select(
      'username',
      'email'
    ).toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .select('username', 'email')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as multiple arguments with aliases', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').select(
      'username as u',
      'email as e'
    ).toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .select('username as u', 'email as e')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as subqueries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const db1 = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db.from('users').select(
      db1.from('addresses').count('* as total').as('addresses_total')
    ).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .select(
        connection.client!.from('addresses').count('* as total').as('addresses_total')
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('define columns as subqueries inside an array', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const db1 = getQueryBuilder(getQueryClient(connection))

    const { sql, bindings } = db.from('users').select([
      db1.from('addresses').count('* as total').as('addresses_total'),
    ]).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .select(
        connection.client!.from('addresses').count('* as total').as('addresses_total')
      )
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | where', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('username', 'virk')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .where('my_username', 'virk')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where clause as an object', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where({ username: 'virk', age: 22 })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .where({ my_username: 'virk', my_age: 22 })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where wrapped clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where((builder) => builder.where('username', 'virk'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .where((builder) => builder.where('my_username', 'virk'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where clause with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', 22)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .where('my_age', '>', 22)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where clause as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .where('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add where clause as a raw builder query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .where('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add orWhere clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('age', '>', 22)
      .orWhere('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .where('my_age', '>', 22)
      .orWhere('my_age', 18)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhere wrapped clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .where('my_age', '>', 22)
      .orWhere((builder) => {
        builder.where('my_age', 18)
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where clause using ref', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('username', 'virk')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .where('my_username', connection.client!.ref('foo.username'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | whereNot', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where not clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('username', 'virk')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNot('my_username', 'virk')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not clause as an object', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot({ username: 'virk', age: 22 })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNot({ my_username: 'virk', my_age: 22 })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add where not wrapped clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot((builder) => builder.where('username', 'virk'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNot((builder) => builder.where('my_username', 'virk'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not clause with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNot('my_age', '>', 22)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not clause as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('age', '>', getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereNot('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot(
        'age', '>', getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages limit 1;'),
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNot('my_age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not clause as a raw builder query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('age', '>', getDb().raw('select min_age from ages limit 1;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereNot('age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNot(
        'age', '>', getDb().raw('select min_age from ages limit 1;'),
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNot('my_age', '>', connection.client!.raw('select min_age from ages limit 1;'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereNot clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNot('age', '>', 22)
      .orWhereNot('age', 18)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNot('my_age', '>', 22)
      .orWhereNot('my_age', 18)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereNot wrapped clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .where('my_age', '>', 22)
      .orWhereNot((builder) => {
        builder.where('my_age', 18)
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereIn', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add whereIn clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereIn('my_username', ['virk', 'nikk'])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereIn as a query callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereIn('my_username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereIn as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', getQueryBuilder(getQueryClient(connection)).select('id').from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereIn('username', connection.client!.select('id').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', getQueryBuilder(getQueryClient(connection)).select('id').from('accounts'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereIn('my_username', connection.client!.select('id').from('accounts'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereIn as a rawquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const ref = connection.client!.ref.bind(connection.client!)

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', [
        getRawQueryBuilder(getQueryClient(connection), `select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereIn('username', [
        connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', [
        getRawQueryBuilder(getQueryClient(connection), `select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereIn('my_username', [
        connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereIn as a raw builder query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const ref = connection.client!.ref.bind(connection.client!)

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', [
        getDb().raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereIn('username', [
        connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn('username', [
        getDb().raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereIn('my_username', [
        connection.client!.raw(`select ${ref('id')} from ${ref('accounts')}`),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereIn as a subquery with array of keys', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn(
        ['username', 'email'],
        getQueryBuilder(getQueryClient(connection)).select('username', 'email').from('accounts'),
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereIn(['username', 'email'], connection.client!.select('username', 'email').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereIn(
        ['username', 'email'],
        getQueryBuilder(getQueryClient(connection)).select('username', 'email').from('accounts'),
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereIn(
        ['my_username', 'my_email'], connection.client!.select('username', 'email').from('accounts'),
      )
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add whereIn as a 2d array', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereIn(['my_username', 'my_email'], [['foo', 'bar']])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereIn clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereIn('username', ['virk', 'nikk'])
      .orWhereIn('username', ['foo'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereIn('my_username', ['virk', 'nikk'])
      .orWhereIn('my_username', ['foo'])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereIn as a query callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add whereNotIn clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotIn('my_username', ['virk', 'nikk'])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereNotIn as a query callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotIn('my_username', (builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereNotIn as a sub query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', getQueryBuilder(getQueryClient(connection)).select('username').from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereNotIn('username', connection.client!.select('username').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereNotIn('username', getQueryBuilder(getQueryClient(connection)).select('username').from('accounts'))
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotIn('my_username', connection.client!.select('username').from('accounts'))
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })

  test('add whereNotIn as a 2d array', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn(['username', 'email'], [['foo', 'bar']])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotIn(['my_username', 'my_email'], [['foo', 'bar']])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereNotIn clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotIn('username', ['virk', 'nikk'])
      .orWhereNotIn('username', ['foo'])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotIn('my_username', ['virk', 'nikk'])
      .orWhereNotIn('my_username', ['foo'])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add orWhereNotIn as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where null clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNull('my_deleted_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where null clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNull('deleted_at')
      .orWhereNull('updated_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNull('my_deleted_at')
      .orWhereNull('my_updated_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNotNull', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where not null clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotNull('my_deleted_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where not null clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotNull('deleted_at')
      .orWhereNotNull('updated_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotNull('my_deleted_at')
      .orWhereNotNull('my_updated_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereExists', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where exists clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add where exists clause as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereExists(connection.client!.from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where exists clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .orWhereExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where exists clause as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .orWhereExists(connection.client!.from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereNotExists', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where exists clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereNotExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add where exists clause as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereNotExists(connection.client!.from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where exists clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereNotExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .orWhereNotExists((builder) => {
        builder.from('accounts')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where exists clause as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereNotExists(getQueryBuilder(getQueryClient(connection)).from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .orWhereNotExists(connection.client!.from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | whereBetween', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where between clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereBetween('age', [18, 20])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereBetween('age', [18, 20])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .whereBetween('age', [18, 20])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereBetween('my_age', [18, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where between clause as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereBetween('my_age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where between clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereBetween('age', [18, 20])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .orWhereBetween('my_age', [18, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where between clause as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where not between clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotBetween('age', [18, 20])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotBetween('my_age', [18, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add where not between clause as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereNotBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .whereNotBetween('my_age', [
        connection.client!.raw('select min_age from ages;'),
        connection.client!.raw('select max_age from ages;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where not between clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereNotBetween('age', [18, 20])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .orWhereNotBetween('age', [18, 20])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orWhereNotBetween('age', [18, 20])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .orWhereNotBetween('my_age', [18, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or where not between clause as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orWhereNotBetween('age', [
        getRawQueryBuilder(getQueryClient(connection), 'select min_age from ages;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max_age from ages;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where raw clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw('id = ?', [1])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereRaw('id = ?', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add where raw clause without bindings', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw('id = 1')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereRaw('id = 1')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add where raw clause with object of bindings', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw('id = :id', { id: 1 })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereRaw('id = :id', { id: 1 })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add where raw clause from a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw(getRawQueryBuilder(getQueryClient(connection), 'select id from accounts;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereRaw(connection.client!.raw('select id from accounts;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or where raw clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .whereRaw('id = ?', [1])
      .orWhereRaw('id = ?', [2])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .whereRaw('id = ?', [1])
      .orWhereRaw('id = ?', [2])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | join', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query join', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .join('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query join with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .join('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query join using join callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .join('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query join as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', 'profiles.type', getRawQueryBuilder(getQueryClient(connection), '?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .join('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query join as a raw builder query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .join('profiles', 'profiles.type', getDb().raw('?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .join('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | innerJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query innerJoin', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .innerJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query innerJoin with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .innerJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query innerJoin using join callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .innerJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query innerJoin as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', 'profiles.type', getRawQueryBuilder(getQueryClient(connection), '?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .innerJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query innerJoin as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .innerJoin('profiles', 'profiles.type', getDb().raw('?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .innerJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | leftJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query leftJoin', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftJoin with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .leftJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftJoin using join callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .leftJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftJoin as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftJoin('profiles', 'profiles.type', getRawQueryBuilder(getQueryClient(connection), '?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .leftJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | leftOuterJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query leftOuterJoin', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .leftOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftOuterJoin with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .leftOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftOuterJoin using join callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .leftOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query leftOuterJoin as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .leftOuterJoin('profiles', 'profiles.type', getRawQueryBuilder(getQueryClient(connection), '?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .leftOuterJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | rightJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query rightJoin', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .rightJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightJoin with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .rightJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightJoin using join callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .rightJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightJoin as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightJoin('profiles', 'profiles.type', getRawQueryBuilder(getQueryClient(connection), '?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .rightJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | rightOuterJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query rightOuterJoin', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .rightOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightOuterJoin with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .rightOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightOuterJoin using join callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .rightOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query rightOuterJoin as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .rightOuterJoin('profiles', 'profiles.type', getRawQueryBuilder(getQueryClient(connection), '?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .rightOuterJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | fullOuterJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query fullOuterJoin', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .fullOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .fullOuterJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query fullOuterJoin with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .fullOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .fullOuterJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query fullOuterJoin using join callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .fullOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .fullOuterJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query fullOuterJoin as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .fullOuterJoin('profiles', 'profiles.type', getRawQueryBuilder(getQueryClient(connection), '?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .fullOuterJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | crossJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query crossJoin', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .crossJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .crossJoin('profiles', 'users.id', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query crossJoin with operator', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .crossJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .crossJoin('profiles', 'users.id', '!=', 'profiles.user_id')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query crossJoin using join callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .crossJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .crossJoin('profiles', (builder) => {
        builder.on('users.id', 'profiles.user_id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add query crossJoin as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .crossJoin('profiles', 'profiles.type', getRawQueryBuilder(getQueryClient(connection), '?', ['social']))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .crossJoin('profiles', 'profiles.type', connection.client!.raw('?', ['social']))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | joinRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add join as a raw join', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .joinRaw('natural full join table1')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .joinRaw('natural full join table1')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add join as a raw join by passing the raw query output', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .joinRaw(getRawQueryBuilder(getQueryClient(connection), 'natural full join table1'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .joinRaw('natural full join table1')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | distinct', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define distinct columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .distinct('name', 'age')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .distinct('my_name', 'my_age')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | groupBy', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define group by columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .groupBy('name', 'age')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .groupBy('my_name', 'my_age')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | groupByRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define group by columns as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .groupByRaw('select (age) from user_profiles')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .groupByRaw('select (age) from user_profiles')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | orderBy', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define order by columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orderBy('name')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .orderBy('my_name')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define order by columns with explicit direction', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orderBy('name', 'desc')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .orderBy('my_name', 'desc')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('define order by columns as an array of objects', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orderBy([{ column: 'name', order: 'desc' }, { column: 'age', order: 'desc' }])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .orderBy([{ column: 'name', order: 'desc' }, { column: 'age', order: 'desc' }])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .orderBy([{ column: 'name', order: 'desc' }, { column: 'age', order: 'desc' }])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .orderBy([{ column: 'name', order: 'desc' }, { column: 'age', order: 'desc' }])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | orderByRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define order by columns as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orderByRaw('col DESC NULLS LAST')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .orderByRaw('col DESC NULLS LAST')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Query Builder | offset', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define select offset', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .offset(10)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .offset(10)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | limit', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define results limit', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .limit(10)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .limit(10)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | union', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('define union query as a callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union((builder) => {
        builder.select('*').from('users').whereNull('first_name')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .union((builder) => {
        builder.select('*').from('users').whereNull('first_name')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union(getQueryBuilder(getQueryClient(connection)).from('users').whereNull('first_name'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .union(connection.client!.from('users').whereNull('first_name'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union(getRawQueryBuilder(getQueryClient(connection), 'select * from users where first_name is null'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .union(connection.client!.raw('select * from users where first_name is null'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as an array of callbacks', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union([(builder) => {
        builder.select('*').from('users').whereNull('first_name')
      }])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .union([(builder) => {
        builder.select('*').from('users').whereNull('first_name')
      }])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as an array of subqueries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union([getQueryBuilder(getQueryClient(connection)).from('users').whereNull('first_name')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .union([connection.client!.from('users').whereNull('first_name')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define union query as an array of raw queries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .union([getRawQueryBuilder(getQueryClient(connection), 'select * from users where first_name is null')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .union([connection.client!.raw('select * from users where first_name is null')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add limit to union set', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert([
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

    await getInsertBuilder(getQueryClient(connection)).table('friends').multiInsert([
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
        builder.select('username').from('users').as('u').union((unionQuery) => {
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

  test('add limit to union subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert([
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

    await getInsertBuilder(getQueryClient(connection)).table('friends').multiInsert([
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
        builder.select('username').from('users').as('u').union((unionQuery) => {
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

  test('count union set', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert([
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

    await getInsertBuilder(getQueryClient(connection)).table('friends').multiInsert([
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
      .count('u.username as total')
      .from((builder) => {
        builder.select('username').from('users').as('u').union((unionQuery) => {
          unionQuery.select('username').from('friends')
        })
      })

    assert.equal(users[0].total, 5)
    await connection.disconnect()
  })

  test('count union set with limit on subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    await getInsertBuilder(getQueryClient(connection)).table('users').multiInsert([
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

    await getInsertBuilder(getQueryClient(connection)).table('friends').multiInsert([
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
      .count('f.username as total')
      .from((builder) => {
        builder.select('username').from('friends').as('f').union((unionQuery) => {
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define unionAll query as a callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll((builder) => {
        builder.select('*').from('users').whereNull('first_name')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .unionAll((builder) => {
        builder.select('*').from('users').whereNull('first_name')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll(getQueryBuilder(getQueryClient(connection)).from('users').whereNull('first_name'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .unionAll(connection.client!.from('users').whereNull('first_name'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll(getRawQueryBuilder(getQueryClient(connection), 'select * from users where first_name is null'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .unionAll(connection.client!.raw('select * from users where first_name is null'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as an array of callbacks', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll([(builder) => {
        builder.select('*').from('users').whereNull('first_name')
      }])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .unionAll([(builder) => {
        builder.select('*').from('users').whereNull('first_name')
      }])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as an array of subqueries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll([getQueryBuilder(getQueryClient(connection)).from('users').whereNull('first_name')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .unionAll([connection.client!.from('users').whereNull('first_name')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define unionAll query as an array of raw queries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .unionAll([getRawQueryBuilder(getQueryClient(connection), 'select * from users where first_name is null')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .unionAll([connection.client!.raw('select * from users where first_name is null')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Query Builder | forUpdate', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define FOR UPDATE lock', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .forUpdate()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .forUpdate()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define FOR UPDATE lock with additional tables (pg only)', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .forUpdate('profiles')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .forUpdate('profiles')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | forShare', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define FOR SHARE lock', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .forShare()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .forShare()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define FOR SHARE lock with additional tables (pg only)', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .forShare('profiles')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .forShare('profiles')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

if (['pg', 'mysql'].includes(process.env.DB!)) {
  test.group('Query Builder | noWait', (group) => {
    group.before(async () => {
      await setup()
    })

    group.after(async () => {
      await cleanup()
    })

    test('add no wait instruction to the query', async (assert) => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .forShare()
        .noWait()
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection.client!
        .from('users')
        .forShare()
        .noWait()
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })
  })

  test.group('Query Builder | skipLocked', (group) => {
    group.before(async () => {
      await setup()
    })

    group.after(async () => {
      await cleanup()
    })

    test('add skip locked instruction to the query', async (assert) => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const db = getQueryBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .from('users')
        .forShare()
        .skipLocked()
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection.client!
        .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having('count', '>', 10)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .having('my_count', '>', 10)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having clause as a callback', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having((builder) => {
        builder.where('id', '>', 10)
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .having((builder) => {
        builder.where('my_id', '>', 10)
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having clause value being a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const ref = connection.client!.ref.bind(connection.client!)

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having(
        'user_id',
        '=',
        getRawQueryBuilder(getQueryClient(connection), `(select ${ref('user_id')} from ${ref('accounts')})`),
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .having(
        'user_id',
        '=',
        connection.client!.raw(`(select ${ref('user_id')} from ${ref('accounts')})`),
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
        getRawQueryBuilder(getQueryClient(connection), `(select ${ref('user_id')} from ${ref('accounts')})`),
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .having(
        'my_user_id',
        '=',
        connection.client!.raw(`(select ${ref('user_id')} from ${ref('accounts')})`),
      )
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having clause value being a sub query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having(
        'user_id',
        '=',
        getQueryBuilder(getQueryClient(connection)).from('accounts').select('id'),
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .having(
        'user_id',
        '=',
        connection.client!.select('id').from('accounts'),
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
        getQueryBuilder(getQueryClient(connection)).from('accounts').select('id'),
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .having(
        'my_user_id',
        '=',
        connection.client!.select('id').from('accounts'),
      )
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having clause as a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw(getRawQueryBuilder(getQueryClient(connection), 'sum(likes) > ?', [200]))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .having(connection.client!.raw('sum(likes) > ?', [200]))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having clause as a raw builder query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw(getDb().raw('sum(likes) > ?', [200]))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .having(connection.client!.raw('sum(likes) > ?', [200]))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or having clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having('count', '>', 10)
      .orHaving('total', '>', 10)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .having('my_count', '>', 10)
      .orHaving('my_total', '>', 10)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingIn', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having in clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingIn('id', [10, 20])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingIn('my_id', [10, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as subqueries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingIn('id', [getQueryBuilder(getQueryClient(connection)).select('id').from('accounts')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingIn('my_id', [connection.client!.select('id').from('accounts') as any])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as raw queries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingIn('id', [getRawQueryBuilder(getQueryClient(connection), 'select id from accounts')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingIn('my_id', [connection.client!.raw('select id from accounts')])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as query callbacks', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const fn = (builder) => {
      builder.select('id').from('accounts')
    }

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingIn('id', fn)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const fnKnex = (builder) => {
      builder.select('my_id').from('accounts')
    }
    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingIn('my_id', fnKnex as any)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having in clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingIn('id', [10, 20])
      .orHavingIn('id', [10, 30])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add not having in clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotIn('id', [10, 20])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      ['havingNotIn']('my_id', [10, 20])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as subqueries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotIn('id', [getQueryBuilder(getQueryClient(connection)).select('id').from('accounts')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      ['havingNotIn']('id', [connection.client!.select('id').from('accounts') as any])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotIn('id', [getQueryBuilder(getQueryClient(connection)).select('id').from('accounts')])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      ['havingNotIn']('my_id', [connection.client!.select('id').from('accounts') as any])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as raw queries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotIn('id', [getRawQueryBuilder(getQueryClient(connection), 'select id from accounts')])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      ['havingNotIn']('id', [connection.client!.raw('select id from accounts')])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    db = getQueryBuilder(getQueryClient(connection))
    db.keysResolver = (key) => `my_${key}`

    const { sql: resolverSql, bindings: resolverBindings } = db
      .from('users')
      .havingNotIn('id', [getRawQueryBuilder(getQueryClient(connection), 'select id from accounts')])
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      ['havingNotIn']('my_id', [connection.client!.raw('select id from accounts')])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having in clause values as query callbacks', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const fn = (builder) => {
      builder.select('id').from('accounts')
    }

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotIn('id', fn)
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const fnKnex = (builder) => {
      builder.select('my_id').from('accounts')
    }

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      ['havingNotIn']('my_id', fnKnex as any)
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having in clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotIn('id', [10, 20])
      .orHavingNotIn('id', [10, 30])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      ['havingNotIn']('my_id', [10, 20])
      ['orHavingNotIn']('my_id', [10, 30])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)
    await connection.disconnect()
  })
})

test.group('Query Builder | havingNull', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having null clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      ['havingNull']('my_deleted_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having null clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNull('deleted_at')
      .orHavingNull('updated_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having null clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotNull('deleted_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      ['havingNotNull']('my_deleted_at')
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having not null clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotNull('deleted_at')
      .orHavingNotNull('updated_at')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having exists clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingExists((builder) => {
        builder.select('*').from('accounts').whereRaw('users.account_id = accounts.id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      ['havingExists']((builder) => {
        builder.select('*').from('accounts').whereRaw('users.account_id = accounts.id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add having exists clause as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingExists(getQueryBuilder(getQueryClient(connection)).select('*').from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      ['havingExists'](connection.client!.select('*').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or having exists clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      ['havingExists']((builder) => {
        builder.select('*').from('accounts')
      })
      .orHavingExists((builder) => {
        builder.select('*').from('profiles')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingNotExists', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having not exists clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotExists((builder) => {
        builder.select('*').from('accounts').whereRaw('users.account_id = accounts.id')
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      ['havingNotExists']((builder) => {
        builder.select('*').from('accounts').whereRaw('users.account_id = accounts.id')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having not exists clause as a subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotExists(getQueryBuilder(getQueryClient(connection)).select('*').from('accounts'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      ['havingNotExists'](connection.client!.select('*').from('accounts'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or having not exists clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      ['havingNotExists']((builder) => {
        builder.select('*').from('accounts')
      })
      .orHavingNotExists((builder) => {
        builder.select('*').from('profiles')
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingBetween', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having between clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingBetween('id', [5, 10])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingBetween('my_id', [5, 10])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having between clause with raw values', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingBetween('id', [
        getRawQueryBuilder(getQueryClient(connection), 'select min(id) from users;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max(id) from users;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingBetween('my_id', [
        connection.client!.raw('select min(id) from users;'),
        connection.client!.raw('select max(id) from users;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having between clause with subqueries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingBetween('id', [
        getQueryBuilder(getQueryClient(connection)).select('id'),
        getQueryBuilder(getQueryClient(connection)).select('id'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingBetween('my_id', [
        connection.client!.select('id') as any,
        connection.client!.select('id') as any,
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having between clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingBetween('id', [5, 10])
      .orHavingBetween('id', [18, 23])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingBetween('my_id', [5, 10])
      .orHavingBetween('my_id', [18, 23])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingNotBetween', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having not between clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotBetween('id', [5, 10])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingNotBetween('my_id', [5, 10])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having not between clause with raw values', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotBetween('id', [
        getRawQueryBuilder(getQueryClient(connection), 'select min(id) from users;'),
        getRawQueryBuilder(getQueryClient(connection), 'select max(id) from users;'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingNotBetween('my_id', [
        connection.client!.raw('select min(id) from users;'),
        connection.client!.raw('select max(id) from users;'),
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add having not between clause with subqueries', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotBetween('id', [
        getQueryBuilder(getQueryClient(connection)).select('id'),
        getQueryBuilder(getQueryClient(connection)).select('id'),
      ])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingNotBetween('my_id', [
        connection.client!.select('id') as any,
        connection.client!.select('id') as any,
      ])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('add or having not between clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingNotBetween('id', [5, 10])
      .orHavingNotBetween('id', [18, 23])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .havingNotBetween('my_id', [5, 10])
      .orHavingNotBetween('my_id', [18, 23])
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | havingRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having raw clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw('id = ?', [1])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .havingRaw('id = ?', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having raw clause without bindings', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw('id = 1')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .havingRaw('id = 1')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('add having raw clause with object of bindings', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw('id = :id', { id: 1 })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .havingRaw('id = :id', { id: 1 })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add having raw clause from a raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw(getRawQueryBuilder(getQueryClient(connection), 'select id from accounts;'))
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .havingRaw(connection.client!.raw('select id from accounts;'))
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('add or having raw clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .havingRaw('id = ?', [1])
      .orHavingRaw('id = ?', [2])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .havingRaw('id = ?', [1])
      .orHavingRaw('id = ?', [2])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearSelect', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear selected columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .select('id', 'username')
      .clearSelect()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .select('id', 'username')
      .clearSelect()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearWhere', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear where clauses', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .where('username', 'virk')
      .clearWhere()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .where('username', 'virk')
      .clearWhere()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearOrder', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear order by columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .orderBy('id', 'desc')
      .clearOrder()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .orderBy('id', 'desc')
      .clearOrder()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearHaving', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear having clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .having('id', '>', 10)
      .clearHaving()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .having('id', '>', 10)
      .clearHaving()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearLimit', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear limit', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .limit(10)
      .clearLimit()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | clearOffset', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear offset', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .offset(1)
      .clearOffset()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

test.group('Query Builder | count', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('count all rows', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count('*', 'total')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .count('*', { as: 'total' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count multiple rows', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .count({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count(getRawQueryBuilder(
        getQueryClient(connection),
        'select * from profiles where is_verified = ?', [true],
      ), 'u')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
      .count(getRawQueryBuilder(
        getQueryClient(connection),
        'select * from profiles where is_verified = ?', [true],
      ), 'u')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .count({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
      .count(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .count({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by raw query on multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count({
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .count({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by subquery on multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .count({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('count all rows', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct('*', 'total')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .countDistinct('*', { as: 'total' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count multiple rows', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .countDistinct({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by raw query', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct(
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .countDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by subquery', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
      .countDistinct(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .countDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by raw query on multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct({
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .countDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('count by subquery on multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .countDistinct({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use min function', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min('*', 'smallest')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .min('*', { as: 'smallest' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use min function for multiple times', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .min({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute min', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min(
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .min({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute min', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
      .min(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .min({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute min with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min({
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .min({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute min with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .min({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use max function', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max('*', 'biggest')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .max('*', { as: 'biggest' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use max function for multiple times', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .max({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute max', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max(
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .max({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute max', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
      .max(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .max({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute max with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max({
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .max({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute max with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .max({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use sum function', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum('*', 'total')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .sum('*', { as: 'total' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use sum function for multiple times', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .sum({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute sum', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum(
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .sum({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute sum', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
      .sum(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .sum({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute sum with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum({
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .sum({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute sum with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .sum({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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

test.group('Query Builder | avg', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use avg function', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg('*', 'avg')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avg('*', { as: 'avg' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use avg function for multiple fields', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avg({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute avg', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg(
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avg({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute avg', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
      .avg(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avg({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute avg with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg({
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avg({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute avg with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avg({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use avgDistinct function', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct('*', 'avgDistinct')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avgDistinct('*', { as: 'avgDistinct' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use avgDistinct function for multiple times', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct({ u: 'username', e: 'email' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avgDistinct({ u: 'my_username', e: 'my_email' })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw queries to compute avgDistinct', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct(
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        'u',
      )
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avgDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subqueries to compute avgDistinct', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
      .avgDistinct(getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'), 'u')
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avgDistinct({
        u: connection.client!.where('is_verified', true).from('profiles'),
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use raw query to compute avgDistinct with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct({
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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
        u: getRawQueryBuilder(getQueryClient(connection), 'select * from profiles where is_verified = ?', [true]),
        e: 'email',
      })
      .toSQL()

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
      .avgDistinct({
        u: connection.client!.raw('select * from profiles where is_verified = ?', [true]),
        e: 'my_email',
      })
      .toSQL()

    assert.equal(resolverSql, knexResolverSql)
    assert.deepEqual(resolverBindings, knexResolverBindings)

    await connection.disconnect()
  })

  test('use subquery to compute avgDistinct with multiple columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .from('users')
      .avgDistinct({
        u: getQueryBuilder(getQueryClient(connection)).where('is_verified', true).from('profiles'),
        e: 'email',
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
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

    const { sql: knexResolverSql, bindings: knexResolverBindings } = connection.client!
      .from('users')
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
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('paginate through rows', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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
      per_page: 5,
      current_page: 1,
      last_page: 4,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=4',
      next_page_url: '/users?page=2',
      previous_page_url: null,
    })

    await connection.disconnect()
  })

  test('paginate through rows and select columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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
      per_page: 5,
      current_page: 1,
      last_page: 4,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=4',
      next_page_url: '/users?page=2',
      previous_page_url: null,
    })

    await connection.disconnect()
  })

  test('paginate through rows when there is orderBy clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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
      per_page: 5,
      current_page: 1,
      last_page: 4,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=4',
      next_page_url: '/users?page=2',
      previous_page_url: null,
    })

    await connection.disconnect()
  })

  test('paginate through rows for the last page', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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
      per_page: 5,
      current_page: 4,
      last_page: 4,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=4',
      next_page_url: null,
      previous_page_url: '/users?page=3',
    })

    await connection.disconnect()
  })

  test('paginate through rows with group by clause', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
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
      per_page: 5,
      current_page: 1,
      last_page: 4,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=4',
      next_page_url: '/users?page=2',
      previous_page_url: null,
    })

    await connection.disconnect()
  })
})

test.group('Query Builder | clone', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('clone query builder', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))

    const clonedQuery = db.from('users').clone()
    assert.deepEqual(clonedQuery, db)
    await connection.disconnect()
  })

  test('copy internal to the cloned query builder', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    let db = getQueryBuilder(getQueryClient(connection))

    const clonedQuery = db.from('users').groupBy('id').clone()
    assert.isTrue(clonedQuery.hasGroupBy)
    await connection.disconnect()
  })
})
