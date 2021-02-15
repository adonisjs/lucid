/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import test from 'japa'

import { Connection } from '../../src/Connection'
import {
  fs,
  setup,
  cleanup,
  getConfig,
  getQueryClient,
  getInsertBuilder,
  setupApplication,
} from '../../test-helpers'

let app: ApplicationContract

test.group('Query Builder | insert', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await fs.cleanup()
  })

  test('perform insert', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection, app))
    const { sql, bindings } = db.table('users').insert({ username: 'virk' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .insert({ username: 'virk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)

    await connection.disconnect()
  })

  test('perform multi insert', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection, app))
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

  test('define returning columns', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const db = getInsertBuilder(getQueryClient(connection, app))
    const { sql, bindings } = db
      .table('users')
      .returning(['id', 'username'])
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection
      .client!.from('users')
      .returning(['id', 'username'])
      .insert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
    await connection.disconnect()
  })
})
