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
import {
  setup,
  cleanup,
  getConfig,
  getQueryClient,
  getInsertBuilder,
  getRawQueryBuilder,
  logger,
} from '../../test-helpers/index.js'

test.group('Query Builder | insert', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('perform insert', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection))
    const { sql, bindings } = db.table('users').insert({ username: 'virk' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .insert({ username: 'virk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('perform multi insert', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .table('users')
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define returning columns', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection))
    const canReturnColumns = db.table('users').client.dialect.supportsReturningStatement

    const { sql, bindings } = db
      .table('users')
      .returning(['id', 'username'])
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    const knexQuery = connection.client!.from('users')
    if (canReturnColumns) {
      knexQuery.returning(['id', 'username'])
    }

    const { sql: knexSql, bindings: knexBindings } = knexQuery
      .insert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })

  test('derive key value from raw query', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection))

    const { sql, bindings } = db
      .table('users')
      .insert({
        username: getRawQueryBuilder(
          getQueryClient(connection),
          `ST_GeomFromText(POINT('row.lat_lng'))`
        ),
      })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .insert({
        username: connection.client!.raw(`ST_GeomFromText(POINT('row.lat_lng'))`),
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define with clause for insert', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .table('users')
      .with(
        'active_users',
        getRawQueryBuilder(getQueryClient(connection), 'select * from users where is_active = ?', [
          true,
        ])
      )
      .insert({ username: 'virk' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .with(
        'active_users',
        connection.client!.raw('select * from users where is_active = ?', [true])
      )
      .insert({ username: 'virk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define withRecursive clause for insert', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .table('users')
      .withRecursive(
        'tree',
        getRawQueryBuilder(getQueryClient(connection), 'select * from categories')
      )
      .insert({ username: 'virk' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .withRecursive('tree', connection.client!.raw('select * from categories'))
      .insert({ username: 'virk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('define comment for insert', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection))
    const { sql, bindings } = db
      .table('users')
      .comment('bulk user insert')
      .insert({ username: 'virk' })
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .comment('bulk user insert')
      .insert({ username: 'virk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })
})

if (['pg', 'sqlite', 'better_sqlite', 'libsql', 'mysql', 'mysql_legacy'].includes(process.env.DB!)) {
  test.group('Query Builder | insert | onConflict', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    test('define on conflict ignore', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getInsertBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .table('users')
        .insert({ username: 'virk' })
        .onConflict()
        .ignore()
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .insert({ username: 'virk' })
        .onConflict()
        .ignore()
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define on conflict ignore with column', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getInsertBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .table('users')
        .insert({ username: 'virk' })
        .onConflict('username')
        .ignore()
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .insert({ username: 'virk' })
        .onConflict('username')
        .ignore()
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define on conflict ignore with multiple columns', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getInsertBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .table('users')
        .insert({ username: 'virk', email: 'virk@adonisjs.com' })
        .onConflict(['username', 'email'])
        .ignore()
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .insert({ username: 'virk', email: 'virk@adonisjs.com' })
        .onConflict(['username', 'email'])
        .ignore()
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define on conflict merge', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getInsertBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .table('users')
        .insert({ username: 'virk' })
        .onConflict('username')
        .merge()
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .insert({ username: 'virk' })
        .onConflict('username')
        .merge()
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define on conflict merge with columns', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getInsertBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .table('users')
        .insert({ username: 'virk', email: 'virk@adonisjs.com' })
        .onConflict('username')
        .merge(['email'])
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .insert({ username: 'virk', email: 'virk@adonisjs.com' })
        .onConflict('username')
        .merge(['email'])
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define on conflict merge with values', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getInsertBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .table('users')
        .insert({ username: 'virk' })
        .onConflict('username')
        .merge({ username: 'nikk' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .insert({ username: 'virk' })
        .onConflict('username')
        .merge({ username: 'nikk' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })
  })
}

if (['pg', 'sqlite', 'better_sqlite', 'libsql'].includes(process.env.DB!)) {
  test.group('Query Builder | insert | withMaterialized', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    test('define withMaterialized clause for insert', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getInsertBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .table('users')
        .withMaterialized(
          'active_users',
          getRawQueryBuilder(getQueryClient(connection), 'select * from users where is_active = 1')
        )
        .insert({ username: 'virk' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withMaterialized(
          'active_users',
          connection.client!.raw('select * from users where is_active = 1')
        )
        .insert({ username: 'virk' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })

    test('define withNotMaterialized clause for insert', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      const db = getInsertBuilder(getQueryClient(connection))
      const { sql, bindings } = db
        .table('users')
        .withNotMaterialized(
          'active_users',
          getRawQueryBuilder(getQueryClient(connection), 'select * from users where is_active = 1')
        )
        .insert({ username: 'virk' })
        .toSQL()

      const { sql: knexSql, bindings: knexBindings } = connection
        .client!.from('users')
        .withNotMaterialized(
          'active_users',
          connection.client!.raw('select * from users where is_active = 1')
        )
        .insert({ username: 'virk' })
        .toSQL()

      assert.equal(sql, knexSql)
      assert.deepEqual(bindings, knexBindings)

      await connection.disconnect()
    })
  })
}
