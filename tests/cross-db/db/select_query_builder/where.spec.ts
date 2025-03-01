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
import { Connection } from '../../../../src/connection.js'
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
      .orWhereGroup((exp) => {
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
      .andWhereGroup((exp) => {
        exp
          .orWhereGroup((exp1) => {
            exp1.where('username', 'virk').where('username', 'romain')
          })
          .orWhereGroup((exp1) => {
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
      .orWhereGroup((exp) => {
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
      .andWhereGroup((exp) => {
        exp
          .orWhereGroup((exp1) => {
            exp1.whereNot('username', 'virk').whereNot('username', 'romain')
          })
          .orWhereGroup((exp1) => {
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
      .orWhereGroup((exp) => {
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
      .andWhereGroup((exp) => {
        exp
          .orWhereGroup((exp1) => {
            exp1
              .whereIn('username', ['virk', 'romain'])
              .whereIn('email', ['virk@adonisjs.com', 'romain@adonisjs.com'])
          })
          .orWhereGroup((exp1) => {
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

test.group('Select query builder | whereJsonObject', () => {
  test('apply where clause on a JSON column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereJsonObject('address', { city: 'gurgaon' }).toSQL()
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
      .whereJsonObject('address', (q) =>
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
      .whereJsonObject(
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
      .orWhereGroup((exp) => {
        exp
          .whereJsonObject('address', { city: 'gurgaon' })
          .whereJsonObject('address', { state: 'karnataka' })
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

test.group('Select query builder | whereNotJsonObject', () => {
  test('apply whereNot clause on a JSON column', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').whereNotJsonObject('address', { city: 'gurgaon' }).toSQL()
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
      .whereNotJsonObject('address', (q) =>
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
      .whereNotJsonObject(
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
      .orWhereGroup((exp) => {
        exp
          .whereNotJsonObject('address', { city: 'gurgaon' })
          .whereNotJsonObject('address', { state: 'karnataka' })
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
      .orWhereGroup((exp) => {
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
