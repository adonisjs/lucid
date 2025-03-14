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

test.group('Select query builder | where', () => {
  test('apply where clause on a column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').where('username', 'virk').toSQL()
    const knexSQL = knex.from('users').where('username', 'virk').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clause on a column with an operator', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').where('username', '!=', 'virk').toSQL()
    const knexSQL = knex.from('users').where('username', '!=', 'virk').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('compare two columns', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').where('username', client.ref('email')).toSQL()
    const knexSQL = knex.from('users').where('username', knex.ref('email')).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('compare using a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .where('username', (q) =>
        q.from('profiles').where('profiles.user_id', client.ref('users.id')).select('username')
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where('username', (q: any) =>
        q.from('profiles').where('profiles.user_id', knex.ref('users.id')).select('username')
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('compute where column from a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .where(
        client
          .raw('select ?? from ?? where ?? = ??', [
            'username',
            'profiles',
            'users.id',
            'profiles.user_id',
          ])
          .wrap('(', ')'),
        'virk'
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      .where(
        knex
          .raw('select ?? from ?? where ?? = ??', [
            'username',
            'profiles',
            'users.id',
            'profiles.user_id',
          ])
          .wrap('(', ')'),
        '=',
        'virk'
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clauses as an object', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .where({
        username: 'virk',
        role: (q) => q.select('name').from('roles').where('role_id', 1),
        ticket_number: client
          .raw('select ?? from ?? where ?? = ?', ['ticket_number', 'lotteries', 'status', 'won'])
          .wrap('(', ')'),
      })
      .toSQL()

    const knexSQL = knex
      .from('users')
      .where({
        username: 'virk',
        role: (q: any) => q.select('name').from('roles').where('role_id', 1),
        ticket_number: knex
          .raw('select ?? from ?? where ?? = ?', ['ticket_number', 'lotteries', 'status', 'won'])
          .wrap('(', ')'),
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply clause in a orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp.where('username', 'virk').where('username', 'romain')
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subQuery) => {
        subQuery.where('username', 'virk').orWhere('username', 'romain')
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply clause in a nested where group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .and((exp) => {
        exp
          .or((exp1) => {
            exp1.where('username', 'virk').where('username', 'romain')
          })
          .or((exp1) => {
            exp1.where('is_admin', true).where('username', 'virk')
          })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subQuery) => {
        subQuery
          .where((subQuery1) => {
            subQuery1.where('username', 'virk').orWhere('username', 'romain')
          })
          .where((subQuery1) => {
            subQuery1.where('is_admin', true).orWhere('username', 'virk')
          })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereColumn', () => {
  test('apply where clause comparing two columns', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereColumn('username', 'email').toSQL()
    const knexSQL = knex.from('users').where('username', knex.ref('email')).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clause on a column with an operator', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereColumn('username', '!=', 'email').toSQL()
    const knexSQL = knex.from('users').where('username', '!=', knex.ref('email')).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clauses as an object', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereColumn({
        username: 'email',
      })
      .toSQL()

    const knexSQL = knex
      .from('users')
      .where({
        username: knex.ref('email'),
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply clause in a orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp.whereColumn('username', 'email').whereColumn('username', 'gh_username')
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subQuery) => {
        subQuery.where('username', knex.ref('email')).orWhere('username', knex.ref('gh_username'))
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereNotColumn', () => {
  test('apply where NOT clause comparing two columns', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNotColumn('username', 'email').toSQL()
    const knexSQL = knex.from('users').whereNot('username', knex.ref('email')).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where NOT clause on a column with an operator', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNotColumn('up_votes', '>', 'down_votes').toSQL()
    const knexSQL = knex.from('users').whereNot('up_votes', '>', knex.ref('down_votes')).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where NOT clauses as an object', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNotColumn({
        username: 'email',
      })
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereNot({
        username: knex.ref('email'),
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where NOT clause in a orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp.whereNotColumn('username', 'email').whereNotColumn('username', 'gh_username')
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subQuery) => {
        subQuery
          .whereNot('username', knex.ref('email'))
          .orWhereNot('username', knex.ref('gh_username'))
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereNot', () => {
  test('apply whereNot clause on a column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNot('username', 'virk').toSQL()
    const knexSQL = knex.from('users').whereNot('username', 'virk').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply whereNot clause on a column with an operator', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNot('username', '!=', 'virk').toSQL()
    const knexSQL = knex.from('users').whereNot('username', '!=', 'virk').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('compare two columns', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNot('username', client.ref('email')).toSQL()
    const knexSQL = knex.from('users').whereNot('username', knex.ref('email')).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('compare using a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNot('username', (q) =>
        q.from('profiles').where('profiles.user_id', client.ref('users.id')).select('username')
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereNot('username', (q: any) =>
        q.from('profiles').where('profiles.user_id', knex.ref('users.id')).select('username')
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('compute whereNot column from a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNot(
        client
          .raw('select ?? from ?? where ?? = ??', [
            'username',
            'profiles',
            'users.id',
            'profiles.user_id',
          ])
          .wrap('(', ')'),
        'virk'
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereNot(
        knex
          .raw('select ?? from ?? where ?? = ??', [
            'username',
            'profiles',
            'users.id',
            'profiles.user_id',
          ])
          .wrap('(', ')'),
        '=',
        'virk'
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply whereNot clauses as an object', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNot({
        username: 'virk',
        role: (q) => q.select('name').from('roles').where('role_id', 1),
        ticket_number: client
          .raw('select ?? from ?? where ?? = ?', ['ticket_number', 'lotteries', 'status', 'won'])
          .wrap('(', ')'),
      })
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereNot({
        username: 'virk',
        role: (q: any) => q.select('name').from('roles').where('role_id', 1),
        ticket_number: knex
          .raw('select ?? from ?? where ?? = ?', ['ticket_number', 'lotteries', 'status', 'won'])
          .wrap('(', ')'),
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply clause in a orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp.whereNot('username', 'virk').whereNot('username', 'romain')
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subQuery) => {
        subQuery.whereNot('username', 'virk').orWhereNot('username', 'romain')
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply clause in a nested where group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .and((exp) => {
        exp
          .or((exp1) => {
            exp1.whereNot('username', 'virk').whereNot('username', 'romain')
          })
          .or((exp1) => {
            exp1.whereNot('is_admin', true).whereNot('username', 'virk')
          })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subQuery) => {
        subQuery
          .where((subQuery1) => {
            subQuery1.whereNot('username', 'virk').orWhereNot('username', 'romain')
          })
          .where((subQuery1) => {
            subQuery1.whereNot('is_admin', true).orWhereNot('username', 'virk')
          })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereIn', () => {
  test('apply whereIn clause on a column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereIn('username', ['virk', 'romain']).toSQL()
    const knexSQL = knex.from('users').whereIn('username', ['virk', 'romain']).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply whereIn clause as a sub-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereIn('country_code', (q) => q.from('countries').select('name').where('operational', true))
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereIn('country_code', (q) => q.from('countries').select('name').where('operational', true))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply whereIn clause as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereIn(
        'country_code',
        client.raw('select ?? from ?? where ?? = ?', ['name', 'countries', 'operational', true])
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereIn(
        'country_code' as any,
        knex.raw('select ?? from ?? where ?? = ?', [
          'name',
          'countries',
          'operational',
          true,
        ]) as any
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('specify whereIn column as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereIn(client.raw('address->>??', ['city']), ['gurgaon', 'delhi', 'mumbai'])
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereIn(knex.raw('address->>??', ['city']) as any, ['gurgaon', 'delhi', 'mumbai'])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply clause in a orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereIn('username', ['virk', 'romain'])
          .whereIn('email', ['virk@adonisjs.com', 'romain@adonisjs.com'])
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subQuery) => {
        subQuery
          .whereIn('username', ['virk', 'romain'])
          .orWhereIn('email', ['virk@adonisjs.com', 'romain@adonisjs.com'])
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply clause in a nested where group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .and((exp) => {
        exp
          .or((exp1) => {
            exp1
              .whereIn('username', ['virk', 'romain'])
              .whereIn('email', ['virk@adonisjs.com', 'romain@adonisjs.com'])
          })
          .or((exp1) => {
            exp1.where('is_deleted', 'null')
          })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subQuery) => {
        subQuery
          .where((subQuery1) => {
            subQuery1
              .whereIn('username', ['virk', 'romain'])
              .orWhereIn('email', ['virk@adonisjs.com', 'romain@adonisjs.com'])
          })
          .where((subQuery1) => {
            subQuery1.where('is_deleted', 'null')
          })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereJson', () => {
  test('apply where clause on a JSON column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereJson('address', { city: 'gurgaon' }).toSQL()
    // @ts-expect-error
    const knexSQL = knex.from('users').whereJsonObject('address', { city: 'gurgaon' }).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clause as a sub-query on a JSON column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJson('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereJsonObject('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select where column as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJson(
        client
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereJsonObject(
        // @ts-expect-error
        knex
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clause in a orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp.whereJson('address', { city: 'gurgaon' }).whereJson('address', { state: 'karnataka' })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((q) => {
        // @ts-expect-error
        q.whereJsonObject('address', { city: 'gurgaon' }).orWhereJsonObject('address', {
          state: 'karnataka',
        })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereNotJson', () => {
  test('apply whereNot clause on a JSON column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNotJson('address', { city: 'gurgaon' }).toSQL()
    // @ts-expect-error
    const knexSQL = knex.from('users').whereNotJsonObject('address', { city: 'gurgaon' }).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply whereNot clause as a sub-query on a JSON column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNotJson('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereNotJsonObject('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('select whereNot column as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNotJson(
        client
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereNotJsonObject(
        // @ts-expect-error
        knex
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clause in a orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereNotJson('address', { city: 'gurgaon' })
          .whereNotJson('address', { state: 'karnataka' })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((q) => {
        // @ts-expect-error
        q.whereNotJsonObject('address', { city: 'gurgaon' }).orWhereNotJsonObject('address', {
          state: 'karnataka',
        })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereJsonPath', () => {
  test('apply where clause on a json column value', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereJsonPath('address', '$.city', '=', 'Gurgaon').toSQL()
    const knexSQL = knex
      .from('users')
      .whereJsonPath('address' as never, '$.city', '=', 'Gurgaon')
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where not clause on a json column value', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereJsonPath('address', '$.city', '!=', 'Gurgaon').toSQL()
    const knexSQL = knex
      .from('users')
      .whereJsonPath('address' as never, '$.city', '!=', 'Gurgaon')
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clause as a sub-query on a json column value', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonPath('address', '$.city', '=', (q) =>
        q.select('city_name').from('cities').where('id', 1)
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereJsonPath('address' as never, '$.city', '=', (q: any) =>
        q.select('city_name').from('cities').where('id', 1)
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clause on a json column value in a orWhereGroup', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereJsonPath('address', '$.city', '=', 'Gurgaon')
          .whereJsonPath('address', '$.state', '=', 'Karnataka')
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subquery) => {
        subquery
          .whereJsonPath('address' as never, '$.city', '=', 'Gurgaon')
          .orWhereJsonPath('address' as never, '$.state', '=', 'Karnataka')
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereNull', () => {
  test('apply where null clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNull('deleted_at').toSQL()
    const knexSQL = knex.from('users').whereNull('deleted_at').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('specify where null column as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNull(client.raw(`??->>??`, ['address', 'city']))
      .toSQL()
    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereNull(knex.raw(`??->>??`, ['address', 'city']))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where null clause in an orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp.whereNull('deleted_at').where('is_deleted', false)
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subquery) => {
        subquery.whereNull('deleted_at').orWhere('is_deleted', false)
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereNotNull', () => {
  test('apply where not null clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNotNull('deleted_at').toSQL()
    const knexSQL = knex.from('users').whereNotNull('deleted_at').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('specify where not null column as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNotNull(client.raw(`??->>??`, ['address', 'city']))
      .toSQL()
    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereNotNull(knex.raw(`??->>??`, ['address', 'city']))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where not null clause in an orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp.whereNotNull('deleted_at').where('is_deleted', false)
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subquery) => {
        subquery.whereNotNull('deleted_at').orWhere('is_deleted', false)
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereExists', () => {
  test('apply where exists clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereExists((q) => {
        q.from('profiles').where('profiles.user_id', client.ref('users.id'))
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereExists((q) => {
        q.from('profiles').where('profiles.user_id', knex.ref('users.id'))
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where exists clause as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereExists(
        client.raw('select * from ?? where ?? = ??', ['profiles', 'profiles.user_id', 'users.id'])
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereExists((q) => {
        q.from('profiles').where('profiles.user_id', knex.ref('users.id'))
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where exists clause in an orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereExists((q) => {
            q.from('profiles').where('profiles.user_id', client.ref('users.id'))
          })
          .whereExists((q) => {
            q.from('social_profiles').where('social_profiles.user_id', client.ref('users.id'))
          })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subquery) => {
        subquery
          .whereExists((q) => {
            q.from('profiles').where('profiles.user_id', knex.ref('users.id'))
          })
          .orWhereExists((q) => {
            q.from('social_profiles').where('social_profiles.user_id', knex.ref('users.id'))
          })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereNotExists', () => {
  test('apply where not exists clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNotExists((q) => {
        q.from('profiles').where('profiles.user_id', client.ref('users.id'))
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereNotExists((q) => {
        q.from('profiles').where('profiles.user_id', knex.ref('users.id'))
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where not exists clause as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNotExists(
        client.raw('select * from ?? where ?? = ??', ['profiles', 'profiles.user_id', 'users.id'])
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereNotExists((q) => {
        q.from('profiles').where('profiles.user_id', knex.ref('users.id'))
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where not exists clause in an orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereNotExists((q) => {
            q.from('profiles').where('profiles.user_id', client.ref('users.id'))
          })
          .whereNotExists((q) => {
            q.from('social_profiles').where('social_profiles.user_id', client.ref('users.id'))
          })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subquery) => {
        subquery
          .whereNotExists((q) => {
            q.from('profiles').where('profiles.user_id', knex.ref('users.id'))
          })
          .orWhereNotExists((q) => {
            q.from('social_profiles').where('social_profiles.user_id', knex.ref('users.id'))
          })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereBetween', () => {
  test('apply where between clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereBetween('age', [18, 60]).toSQL()
    const knexSQL = knex.from('users').whereBetween('age', [18, 60]).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('supply where between values as a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereBetween('age', [
        (q) => q.from('rules').select('min_age'),
        (q) => q.from('rules').select('max_age'),
      ])
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereBetween('age', [
        (q: any) => q.from('rules').select('min_age'),
        (q: any) => q.from('rules').select('max_age'),
      ])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('supply where between values as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereBetween('age', [
        client.raw('select ?? from ??', ['min_age', 'rules']).wrap('(', ')'),
        client.raw('select ?? from ??', ['max_age', 'rules']).wrap('(', ')'),
      ])
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereBetween('age', [
        (q: any) => q.from('rules').select('min_age'),
        (q: any) => q.from('rules').select('max_age'),
      ])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where between clause in a orWhereGroup', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereBetween('age', [
            (q) => q.from('rules').select('min_age'),
            (q) => q.from('rules').select('max_age'),
          ])
          .whereNull('age')
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subquery) => {
        subquery
          .whereBetween('age', [
            (q: any) => q.from('rules').select('min_age'),
            (q: any) => q.from('rules').select('max_age'),
          ])
          .orWhereNull('age')
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereNotBetween', () => {
  test('apply where not between clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNotBetween('age', [18, 60]).toSQL()
    const knexSQL = knex.from('users').whereNotBetween('age', [18, 60]).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('supply where not between values as a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNotBetween('age', [
        (q) => q.from('rules').select('min_age'),
        (q) => q.from('rules').select('max_age'),
      ])
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereNotBetween('age', [
        (q: any) => q.from('rules').select('min_age'),
        (q: any) => q.from('rules').select('max_age'),
      ])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('supply where not between values as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereNotBetween('age', [
        client.raw('select ?? from ??', ['min_age', 'rules']).wrap('(', ')'),
        client.raw('select ?? from ??', ['max_age', 'rules']).wrap('(', ')'),
      ])
      .toSQL()
    const knexSQL = knex
      .from('users')
      .whereNotBetween('age', [
        (q: any) => q.from('rules').select('min_age'),
        (q: any) => q.from('rules').select('max_age'),
      ])
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where not between clause in a orWhereGroup', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereNotBetween('age', [
            (q) => q.from('rules').select('min_age'),
            (q) => q.from('rules').select('max_age'),
          ])
          .whereNotNull('age')
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((subquery) => {
        subquery
          .whereNotBetween('age', [
            (q: any) => q.from('rules').select('min_age'),
            (q: any) => q.from('rules').select('max_age'),
          ])
          .orWhereNotNull('age')
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereRaw', () => {
  test('apply where clause as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereRaw(`??->>'city' = ?`, ['address', 'Gurgaon']).toSQL()
    const knexSQL = knex.from('users').whereRaw(`??->>'city' = ?`, ['address', 'Gurgaon']).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply where clause as a raw query inside an or where group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereRaw(`??->>'city' = ?`, ['address', 'Gurgaon'])
          .whereRaw(`??->>'pincode' = ?`, ['address', '122001'])
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((q) => {
        q.whereRaw(`??->>'city' = ?`, ['address', 'Gurgaon']).orWhereRaw(`??->>'pincode' = ?`, [
          'address',
          '122001',
        ])
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereJsonSubset', (group) => {
  group.tap((t) =>
    t.skip(!['mysql', 'pg'].includes(process.env.DB!), 'Runs for MYSQL and PostgreSQL')
  )

  test('apply JSON subset conditional on a column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereJsonSubset('address', { city: 'gurgaon' }).toSQL()
    // @ts-expect-error
    const knexSQL = knex.from('users').whereJsonSubsetOf('address', { city: 'gurgaon' }).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON subset conditional as a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonSubset('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereJsonSubsetOf('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON subset conditional to a column selected via raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonSubset(
        client
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereJsonSubsetOf(
        // @ts-expect-error
        knex
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON subset conditional in an orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereJsonSubset('address', { city: 'gurgaon' })
          .whereJsonSubset('address', { state: 'karnataka' })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((q) => {
        // @ts-expect-error
        q.whereJsonSubsetOf('address', { city: 'gurgaon' }).orWhereJsonSubsetOf('address', {
          state: 'karnataka',
        })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereJsonNotSubset', (group) => {
  group.tap((t) =>
    t.skip(!['mysql', 'pg'].includes(process.env.DB!), 'Runs for MYSQL and PostgreSQL')
  )

  test('apply JSON not subset conditional on a column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereJsonNotSubset('address', { city: 'gurgaon' }).toSQL()
    // @ts-expect-error
    const knexSQL = knex.from('users').whereJsonNotSubsetOf('address', { city: 'gurgaon' }).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON not subset conditional as a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonNotSubset('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereJsonNotSubsetOf('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON not subset conditional to a column selected via raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonNotSubset(
        client
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereJsonNotSubsetOf(
        // @ts-expect-error
        knex
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON not subset conditional in an orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereJsonNotSubset('address', { city: 'gurgaon' })
          .whereJsonNotSubset('address', { state: 'karnataka' })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((q) => {
        // @ts-expect-error
        q.whereJsonNotSubsetOf('address', { city: 'gurgaon' }).orWhereJsonNotSubsetOf('address', {
          state: 'karnataka',
        })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereJsonSuperset', (group) => {
  group.tap((t) =>
    t.skip(!['mysql', 'pg'].includes(process.env.DB!), 'Runs for MYSQL and PostgreSQL')
  )

  test('apply JSON superset conditional on a column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereJsonSuperset('address', { city: 'gurgaon' }).toSQL()
    // @ts-expect-error
    const knexSQL = knex.from('users').whereJsonSupersetOf('address', { city: 'gurgaon' }).toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON superset conditional as a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonSuperset('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereJsonSupersetOf('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON superset conditional to a column selected via raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonSuperset(
        client
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereJsonSupersetOf(
        // @ts-expect-error
        knex
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON superset conditional in an orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereJsonSuperset('address', { city: 'gurgaon' })
          .whereJsonSuperset('address', { state: 'karnataka' })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((q) => {
        // @ts-expect-error
        q.whereJsonSupersetOf('address', { city: 'gurgaon' }).orWhereJsonSupersetOf('address', {
          state: 'karnataka',
        })
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | whereJsonNotSuperset', (group) => {
  group.tap((t) =>
    t.skip(!['mysql', 'pg'].includes(process.env.DB!), 'Runs for MYSQL and PostgreSQL')
  )

  test('apply JSON not superset conditional on a column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereJsonNotSuperset('address', { city: 'gurgaon' }).toSQL()
    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereJsonNotSupersetOf('address', { city: 'gurgaon' })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON superset conditional as a subquery', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonNotSuperset('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      // @ts-expect-error
      .whereJsonNotSupersetOf('address', (q) =>
        q.select('address').from('user_addresses').where('is_permanent', true)
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON superset conditional to a column selected via raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .whereJsonNotSuperset(
        client
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    const knexSQL = knex
      .from('users')
      .whereJsonNotSupersetOf(
        // @ts-expect-error
        knex
          .raw('select ?? from ?? where ?? = ??', [
            'address',
            'user_addresses',
            'user_id',
            'users.id',
          ])
          .wrap('(', ')'),
        { city: 'gurgaon' }
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply JSON superset conditional in an orWhere group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .or((exp) => {
        exp
          .whereJsonNotSuperset('address', { city: 'gurgaon' })
          .whereJsonNotSuperset('address', { state: 'karnataka' })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .where((q) => {
        // @ts-expect-error
        q.whereJsonNotSupersetOf('address', { city: 'gurgaon' }).orWhereJsonNotSupersetOf(
          // @ts-expect-error
          'address',
          {
            state: 'karnataka',
          }
        )
      })
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})
