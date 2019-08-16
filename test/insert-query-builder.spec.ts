/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/database.ts" />

import * as test from 'japa'

import { Connection } from '../src/Connection'
import { getConfig, setup, cleanup, getInsertBuilder, getLogger } from '../test-helpers'

test.group('Query Builder | from', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('perform insert', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getInsertBuilder(connection.getClient())
    const { sql, bindings } = db.table('users').insert({ username: 'virk' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .insert({ username: 'virk' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('perform multi insert', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getInsertBuilder(connection.getClient())
    const { sql, bindings } = db
      .table('users')
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('define returning columns', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    const db = getInsertBuilder(connection.getClient())
    const { sql, bindings } = db
      .table('users')
      .returning(['id', 'username'])
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = connection.client!
      .from('users')
      .returning(['id', 'username'])
      .insert([{ username: 'virk' }, { username: 'nikk' }])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})
