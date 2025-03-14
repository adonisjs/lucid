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

test.group('Select query builder | orderBy', () => {
  test('apply order by on a single column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').orderBy('id').toSQL()
    const knexSQL = knex.from('users').orderBy('id').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply order by with an explicit direction', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').orderBy('id', 'desc').toSQL()
    const knexSQL = knex.from('users').orderBy('id', 'desc').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply order by as a sub-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .orderBy((q) => q.from('profiles').limit(1).select('updated_at'), 'desc')
      .toSQL()
    const knexSQL = knex
      .from('users')
      .orderBy(knex.from('profiles').limit(1).select('updated_at'), 'desc')
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply order by as a raw-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .orderBy(
        client.raw('select ?? from ?? limit ?', ['updated_at', 'profiles', 1]).wrap('(', ')'),
        'desc'
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .orderBy(knex.from('profiles').limit(1).select('updated_at'), 'desc')
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply order by on multiple columns', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').orderBy(['id', 'name']).toSQL()
    const knexSQL = knex.from('users').orderBy(['id', 'name']).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply order by as an array of objects', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .orderBy([
        { column: 'id', order: 'asc' },
        { column: 'name', order: 'desc', nulls: 'last' },
      ])
      .toSQL()
    const knexSQL = knex
      .from('users')
      .orderBy([
        { column: 'id', order: 'asc' },
        { column: 'name', order: 'desc', nulls: 'last' },
      ])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply order by as an array of objects with a sub-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .orderBy([
        { column: (q) => q.from('profiles').limit(1).select('updated_at'), order: 'asc' },
        { column: 'name', order: 'desc', nulls: 'last' },
      ])
      .toSQL()
    const knexSQL = knex
      .from('users')
      .orderBy([
        { column: knex.from('profiles').limit(1).select('updated_at'), order: 'asc' },
        { column: 'name', order: 'desc', nulls: 'last' },
      ])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply order by as an array of objects with a raw-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .orderBy([
        {
          column: client
            .raw('select ?? from ?? limit ?', ['updated_at', 'profiles', 1])
            .wrap('(', ')'),
          order: 'asc',
        },
        { column: 'name', order: 'desc', nulls: 'last' },
      ])
      .toSQL()
    const knexSQL = knex
      .from('users')
      .orderBy([
        { column: knex.from('profiles').limit(1).select('updated_at'), order: 'asc' },
        { column: 'name', order: 'desc', nulls: 'last' },
      ])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})
