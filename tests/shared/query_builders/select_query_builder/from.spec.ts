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

test.group('Select query builder | from', () => {
  test('select from a table', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').toSQL()
    const knexSQL = knex.from('users').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('alias table', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from({ u: 'users' }).toSQL()
    const knexSQL = knex.from('users as u').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('specify table via scoped sub-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from({
        salaries: (subquery) => {
          subquery
            .from('salaries')
            .select(client.fn.sum('amount').as('salaries_paid'))
            .where('status', 'settled')
        },
        reimbursements: (subquery) => {
          subquery
            .from('reimbursements')
            .select(client.fn.sum('amount').as('reimbursements_paid'))
            .where('status', 'settled')
        },
      })
      .select([
        'salaries_paid',
        'reimbursements_paid',
        client.raw('salaries_paid + reimbursements_paid as total_spendings'),
      ])
      .toSQL()

    const knexSQL = knex
      .from({
        // @ts-expect-error
        salaries: knex
          .from('salaries')
          .sum('amount', { as: 'salaries_paid' })
          .where('status', 'settled'),
        reimbursements: knex
          .from('reimbursements')
          .sum('amount', { as: 'reimbursements_paid' })
          .where('status', 'settled'),
      })
      .select([
        'salaries_paid',
        'reimbursements_paid',
        knex.raw('salaries_paid + reimbursements_paid as total_spendings'),
      ])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('specify table via sub-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from(query.createSelectSubQuery().select('name').from('users').as('u'))
      .toSQL()
    const knexSQL = knex.from((q: any) => q.select('name').from('users').as('u')).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('specify table via raw expression builder', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from(client.raw('select ?? from ??', ['name', 'users']).wrap('(', ')'))
      .toSQL()
    const knexSQL = knex.from((q: any) => q.select('name').from('users')).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})
