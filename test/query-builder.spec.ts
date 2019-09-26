/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/database.ts" />

import test from 'japa'
import { Connection } from '../src/Connection'
import { DatabaseQueryBuilder } from '../src/Database/QueryBuilder/Database'
import {
  setup,
  cleanup,
  getConfig,
  getLogger,
  getQueryClient,
  getQueryBuilder,
  getInsertBuilder,
  getRawQueryBuilder,
} from '../test-helpers'

if (process.env.DB !== 'sqlite') {
  test.group('Query Builder | client', (group) => {
    group.before(async () => {
      await setup()
    })

    group.after(async () => {
      await cleanup()
    })

    test('use read client when making select query', (assert) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getReadClient = function getReadClient () {
        assert.isTrue(true)
        return this._connection.client
      }

      db.select('*').from('users')
      db['getQueryClient']()
    })

    test('use write client for update', (assert) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getWriteClient = function getWriteClient () {
        assert.isTrue(true)
        return this._connection.client
      }

      db.from('users').update('username', 'virk')
      db['getQueryClient']()
    })

    test('use write client for delete', (assert) => {
      assert.plan(1)
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)
      const db = getQueryBuilder(client)

      client.getWriteClient = function getWriteClient () {
        assert.isTrue(true)
        return this._connection.client
      }

      db.from('users').del()
      db['getQueryClient']()
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
      await db.select('*').from('users').useTransaction(trx).exec()
      await trx.commit()
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
      await db.table('users').useTransaction(trx).insert({ username: 'virk' }).exec()
      await trx.rollback()
    })

    test('use transaction client when query is issued from transaction client', async () => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)

      client.getReadClient = function getReadClient () {
        throw new Error('Never expected to reach here')
      }

      const trx = await client.transaction()
      await trx.query().select('*').from('users').exec()
      await trx.commit()
    })

    test('use transaction client when insert query is issued from transaction client', async () => {
      const connection = new Connection('primary', getConfig(), getLogger())
      connection.connect()

      const client = getQueryClient(connection)

      const trx = await client.transaction()
      trx.getReadClient = function getReadClient () {
        throw new Error('Never expected to reach here')
      }

      await trx.insertQuery().table('users').insert({ username: 'virk' }).exec()
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

  test('define query table', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
    const { sql, bindings } = db.from('users').toSQL()
    const { sql: knexSql, bindings: knexBindings } = connection.client!.from('users').toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
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

test.group('Query Builder | where', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where clause as an object', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where wrapped clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where clause with operator', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where clause as a raw query', (assert) => {
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
  })

  test('add orWhere clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add orWhere wrapped clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | whereNot', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where no clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where not clause as an object', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where not wrapped clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where not clause with operator', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where not clause as a raw query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add orWhereNot clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add orWhereNot wrapped clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | whereIn', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add whereIn clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add whereIn as a query callback', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add whereIn as a subquery', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add whereIn as a rawquery', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const ref = connection.client!.ref.bind(connection.client!)

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add whereIn as a subquery with array of keys', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add whereIn as a 2d array', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add orWhereIn clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add orWhereIn as a query callback', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | whereNotIn', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add whereNotIn clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add whereNotIn as a query callback', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add whereNotIn as a sub query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add whereNotIn as a 2d array', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add orWhereNotIn clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add orWhereNotIn as a subquery', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | whereNull', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where null clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or where null clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | whereNotNull', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where not null clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or where not null clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | whereExists', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where exists clause', (assert) => {
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
  })

  test('add where exists clause as a subquery', (assert) => {
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
  })

  test('add or where exists clause', (assert) => {
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
  })

  test('add or where exists clause as a subquery', (assert) => {
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
  })
})

test.group('Query Builder | whereNotExists', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where exists clause', (assert) => {
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
  })

  test('add where exists clause as a subquery', (assert) => {
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
  })

  test('add or where exists clause', (assert) => {
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
  })

  test('add or where exists clause as a subquery', (assert) => {
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
  })
})

test.group('Query Builder | whereBetween', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where between clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where between clause as a raw query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or where between clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or where between clause as a raw query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | whereNotBetween', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where not between clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add where not between clause as a raw query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or where not between clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or where not between clause as a raw query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | whereRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add where raw clause', (assert) => {
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
  })

  test('add where raw clause without bindings', (assert) => {
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
  })

  test('add where raw clause with object of bindings', (assert) => {
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
  })

  test('add where raw clause from a raw query', (assert) => {
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
  })

  test('add or where raw clause', (assert) => {
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
  })
})

test.group('Query Builder | join', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query join', (assert) => {
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
  })

  test('add query join with operator', (assert) => {
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
  })

  test('add query join using join callback', (assert) => {
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
  })

  test('add query join as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | innerJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query innerJoin', (assert) => {
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
  })

  test('add query innerJoin with operator', (assert) => {
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
  })

  test('add query innerJoin using join callback', (assert) => {
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
  })

  test('add query innerJoin as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | leftJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query leftJoin', (assert) => {
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
  })

  test('add query leftJoin with operator', (assert) => {
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
  })

  test('add query leftJoin using join callback', (assert) => {
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
  })

  test('add query leftJoin as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | leftOuterJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query leftOuterJoin', (assert) => {
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
  })

  test('add query leftOuterJoin with operator', (assert) => {
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
  })

  test('add query leftOuterJoin using join callback', (assert) => {
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
  })

  test('add query leftOuterJoin as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | rightJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query rightJoin', (assert) => {
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
  })

  test('add query rightJoin with operator', (assert) => {
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
  })

  test('add query rightJoin using join callback', (assert) => {
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
  })

  test('add query rightJoin as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | rightOuterJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query rightOuterJoin', (assert) => {
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
  })

  test('add query rightOuterJoin with operator', (assert) => {
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
  })

  test('add query rightOuterJoin using join callback', (assert) => {
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
  })

  test('add query rightOuterJoin as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | fullOuterJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query fullOuterJoin', (assert) => {
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
  })

  test('add query fullOuterJoin with operator', (assert) => {
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
  })

  test('add query fullOuterJoin using join callback', (assert) => {
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
  })

  test('add query fullOuterJoin as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | crossJoin', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add query crossJoin', (assert) => {
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
  })

  test('add query crossJoin with operator', (assert) => {
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
  })

  test('add query crossJoin using join callback', (assert) => {
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
  })

  test('add query crossJoin as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | joinRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add join as a raw join', (assert) => {
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
  })

  test('add join as a raw join by passing the raw query output', (assert) => {
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
  })
})

test.group('Query Builder | distinct', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define distinct columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | groupBy', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define group by columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | groupByRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define group by columns as a raw query', (assert) => {
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
  })
})

test.group('Query Builder | orderBy', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define order by columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('define order by columns with explicit direction', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('define order by columns as an array of objects', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | orderByRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define order by columns as a raw query', (assert) => {
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

  test('define select offset', (assert) => {
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
  })
})

test.group('Query Builder | limit', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define results limit', (assert) => {
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
  })
})

test.group('Query Builder | union', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define union query as a callback', (assert) => {
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
  })

  test('define union query as a subquery', (assert) => {
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
  })

  test('define union query as a raw query', (assert) => {
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
  })

  test('define union query as an array of callbacks', (assert) => {
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
  })

  test('define union query as an array of subqueries', (assert) => {
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
  })

  test('define union query as an array of raw queries', (assert) => {
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
  })
})

test.group('Query Builder | unionAll', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define unionAll query as a callback', (assert) => {
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
  })

  test('define unionAll query as a subquery', (assert) => {
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
  })

  test('define unionAll query as a raw query', (assert) => {
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
  })

  test('define unionAll query as an array of callbacks', (assert) => {
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
  })

  test('define unionAll query as an array of subqueries', (assert) => {
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
  })

  test('define unionAll query as an array of raw queries', (assert) => {
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

  test('define FOR UPDATE lock', (assert) => {
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
  })

  test('define FOR UPDATE lock with additional tables (pg only)', (assert) => {
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
  })
})

test.group('Query Builder | forShare', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('define FOR SHARE lock', (assert) => {
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
  })

  test('define FOR SHARE lock with additional tables (pg only)', (assert) => {
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

    test('add no wait instruction to the query', (assert) => {
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
    })
  })

  test.group('Query Builder | skipLocked', (group) => {
    group.before(async () => {
      await setup()
    })

    group.after(async () => {
      await cleanup()
    })

    test('add skip locked instruction to the query', (assert) => {
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

  test('add having clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having clause as a callback', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having clause value being a raw query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    const ref = connection.client!.ref.bind(connection.client!)

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having clause value being a sub query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having clause as a raw query', (assert) => {
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
  })

  test('add or having clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | havingIn', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having in clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having in clause values as subqueries', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having in clause values as raw queries', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having in clause values as query callbacks', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const fn = (builder) => {
      builder.select('id').from('accounts')
    }

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or having in clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | havingNotIn', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add not having in clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having in clause values as subqueries', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having in clause values as raw queries', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having in clause values as query callbacks', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const fn = (builder) => {
      builder.select('id').from('accounts')
    }

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or having in clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | havingNull', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having null clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or having null clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | havingNotNull', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having null clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or having not null clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | havingExists', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having exists clause', (assert) => {
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
  })

  test('add having exists clause as a subquery', (assert) => {
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
  })

  test('add or having exists clause', (assert) => {
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
  })
})

test.group('Query Builder | havingNotExists', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having not exists clause', (assert) => {
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
  })

  test('add having not exists clause as a subquery', (assert) => {
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
  })

  test('add or having not exists clause', (assert) => {
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
  })
})

test.group('Query Builder | havingBetween', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having between clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having between clause with raw values', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having between clause with subqueries', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or having between clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | havingNotBetween', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having not between clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having not between clause with raw values', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add having not between clause with subqueries', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('add or having not between clause', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | havingRaw', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('add having raw clause', (assert) => {
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
  })

  test('add having raw clause without bindings', (assert) => {
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
  })

  test('add having raw clause with object of bindings', (assert) => {
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
  })

  test('add having raw clause from a raw query', (assert) => {
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
  })

  test('add or having raw clause', (assert) => {
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
  })
})

test.group('Query Builder | clearSelect', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear selected columns', (assert) => {
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
  })
})

test.group('Query Builder | clearWhere', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear where clauses', (assert) => {
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
  })
})

test.group('Query Builder | clearOrder', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear order by columns', (assert) => {
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
  })
})

test.group('Query Builder | clearHaving', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('clear having clause', (assert) => {
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
  })
})

test.group('Query Builder | count', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('count all rows', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count multiple rows', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count by raw query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count by subquery', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count by raw query on multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count by subquery on multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | countDistinct', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('count all rows', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count multiple rows', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count by raw query', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count by subquery', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count by raw query on multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('count by subquery on multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | min', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use min function', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use min function for multiple times', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw queries to compute min', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subqueries to compute min', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw query to compute min with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subquery to compute min with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | max', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use max function', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use max function for multiple times', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw queries to compute max', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subqueries to compute max', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw query to compute max with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subquery to compute max with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | sum', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use sum function', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use sum function for multiple times', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw queries to compute sum', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subqueries to compute sum', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw query to compute sum with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subquery to compute sum with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | avg', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use avg function', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use avg function for multiple times', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw queries to compute avg', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subqueries to compute avg', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw query to compute avg with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subquery to compute avg with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})

test.group('Query Builder | avgDistinct', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('use avgDistinct function', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use avgDistinct function for multiple times', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw queries to compute avgDistinct', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subqueries to compute avgDistinct', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use raw query to compute avgDistinct with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })

  test('use subquery to compute avgDistinct with multiple columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getQueryBuilder(getQueryClient(connection))
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
  })
})
