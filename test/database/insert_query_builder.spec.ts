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
})
