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

test.group('Select query builder | clone', () => {
  test('clone query', async ({ assert, cleanup }) => {
    const connection = new Connection('primary', getConnectionConfig())
    cleanup(() => connection.close())

    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)
      .from('users')
      .select(['id', 'name'])
      .withContext({ requestId: 1 })

    const clonedQuery = query.clone().whereNotNull('username').withContext({ userId: 1 })
    assert.deepEqual(clonedQuery.getContext(), { userId: 1, requestId: 1 })
    assert.deepEqual(query.getContext(), { requestId: 1 })

    const sql = query.toSQL()
    const clonedQuerySql = clonedQuery.toSQL()

    const knexSQL = knex.from('users').select(['id', 'name']).toSQL()
    const knexClonedQuerySQL = knex
      .from('users')
      .select(['id', 'name'])
      .whereNotNull('username')
      .toSQL()

    debug('%O', sql)
    debug('%O', clonedQuerySql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)

    assert.equal(clonedQuerySql.sql, knexClonedQuerySQL.sql)
    assert.deepEqual(clonedQuerySql.bindings, knexClonedQuerySQL.bindings)
    assert.equal(clonedQuerySql.method, knexClonedQuerySQL.method)
  })
})
