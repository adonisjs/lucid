/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../../../../src/debug.js'
import { getConnectionConfig } from '../../../helpers.js'
import { Connection } from '../../../../src/connection/connection.js'
import { SelectQueryBuilder } from '../../../../src/query_builders/select_query_builder.js'

test.group('Select query builder | select', () => {
  test('select columns as a string', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.select('username', 'id', 'email').toSQL()
    const knexSQL = knex.select('username', 'id', 'email').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select columns using a scoped sub-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .select('username', 'id', (q) => q.select('email').from('user_emails').as('user_email'))
      .toSQL()

    const knexSQL = knex
      .select('username', 'id', (q: any) => q.select('email').from('user_emails').as('user_email'))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select columns using a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .select(
        'username',
        'id',
        query.createSelectSubQuery().select('email').from('user_emails').as('user_email')
      )
      .toSQL()

    const knexSQL = knex
      .select('username', 'id', (q: any) => q.select('email').from('user_emails').as('user_email'))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select columns as an object', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .select({
        uname: 'username',
        id: 'id',
        user_email: (q) => q.select('email').from('user_emails'),
      })
      .toSQL()

    const knexSQL = knex
      .select({
        uname: 'username',
        id: 'id',
        user_email: (q: any) => q.select('email').from('user_emails').as('user_email'),
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select columns with mix-match of objects and strings', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .select(['username', 'id', { user_email: (q) => q.select('email').from('user_emails') }])
      .toSQL()

    const knexSQL = knex
      .select(['username', 'id', { user_email: (q: any) => q.select('email').from('user_emails') }])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select columns using a raw expression builder', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .select([
        'username',
        'id',
        client
          .raw(`select ?? from ??`, ['email', 'user_emails'])
          .wrap('(', `) as ${knex.ref('user_email').toQuery()}`),
      ])
      .toSQL()

    const knexSQL = knex
      .select(['username', 'id', { user_email: (q: any) => q.select('email').from('user_emails') }])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select columns using a ref expression builder', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.select(['username', 'id', client.ref('email')]).toSQL()
    const knexSQL = knex.select(['username', 'id', knex.ref('email')]).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('chain select calls', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .select('username', 'id')
      .select(query.createSelectSubQuery().select('email').from('user_emails').as('user_email'))
      .toSQL()
    const knexSQL = knex
      .select('username', 'id', (q: any) => q.select('email').from('user_emails').as('user_email'))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('clear selection', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .select('username', 'id')
      .clearSelect()
      .select(query.createSelectSubQuery().select('email').from('user_emails').as('user_email'))
      .toSQL()
    const knexSQL = knex
      .select('username', 'id')
      .clearSelect()
      .select((q: any) => q.select('email').from('user_emails').as('user_email'))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})
