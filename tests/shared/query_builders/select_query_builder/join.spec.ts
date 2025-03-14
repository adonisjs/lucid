/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import { debug } from '../../../../src/debug.js'
import { getConnectionConfig } from '../../../helpers.js'
import { Connection } from '../../../../src/connection/connection.js'
import { SelectQueryBuilder } from '../../../../src/query_builders/select_query_builder.js'

test.group('Select query builder | join', () => {
  test('apply join on a SQL query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').join('profiles', 'profiles.user_id', 'users.id').toSQL()
    const knexSQL = knex.from('users').join('profiles', 'profiles.user_id', 'users.id').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('specify join table as a sub query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join(
        (q) => q.from('profiles').where('is_active', true).as('profiles'),
        'profiles.user_id',
        'users.id'
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join(
        knex.from('profiles').where('is_active', true).as('profiles'),
        'profiles.user_id',
        'users.id'
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('specify join table as a raw-query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join(
        client
          .raw('select * from ?? where ?? = ?', ['profiles', 'is_active', true])
          .wrap('(', client.raw(') as ??', ['profiles'])),
        'profiles.user_id',
        'users.id'
      )
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join(
        knex.from('profiles').where('is_active', true).as('profiles'),
        'profiles.user_id',
        'users.id'
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply inner join on a SQL query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').innerJoin('profiles', 'profiles.user_id', 'users.id').toSQL()
    const knexSQL = knex.from('users').innerJoin('profiles', 'profiles.user_id', 'users.id').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply left join on a SQL query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').leftJoin('profiles', 'profiles.user_id', 'users.id').toSQL()
    const knexSQL = knex.from('users').leftJoin('profiles', 'profiles.user_id', 'users.id').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply left outer join on a SQL query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .leftOuterJoin('profiles', 'profiles.user_id', 'users.id')
      .toSQL()
    const knexSQL = knex
      .from('users')
      .leftOuterJoin('profiles', 'profiles.user_id', 'users.id')
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply right join on a SQL query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').rightJoin('profiles', 'profiles.user_id', 'users.id').toSQL()
    const knexSQL = knex.from('users').rightJoin('profiles', 'profiles.user_id', 'users.id').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply right outer join on a SQL query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .rightOuterJoin('profiles', 'profiles.user_id', 'users.id')
      .toSQL()
    const knexSQL = knex
      .from('users')
      .rightOuterJoin('profiles', 'profiles.user_id', 'users.id')
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply full outer join on a SQL query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .fullOuterJoin('profiles', 'profiles.user_id', 'users.id')
      .toSQL()
    const knexSQL = knex
      .from('users')
      .fullOuterJoin('profiles', 'profiles.user_id', 'users.id')
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply cross join on a SQL query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query.from('users').crossJoin('profiles', 'profiles.user_id', 'users.id').toSQL()
    const knexSQL = knex.from('users').crossJoin('profiles', 'profiles.user_id', 'users.id').toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.on', () => {
  test('apply join on using a callback', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('profiles', (joinExp) => {
        joinExp.on('profiles.user_id', 'users.id')
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('profiles', (join) => join.on('profiles.user_id', 'users.id'))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply join on inside an or group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('profiles', (joinExp) => {
        joinExp.or((exp) => {
          exp.on('profiles.user_id', 'users.id').onNull('profiles.user_id')
        })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('profiles', (join) =>
        join.on((join1) => {
          join1.on('profiles.user_id', 'users.id').orOnNull('profiles.user_id')
        })
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.onNull', () => {
  test('apply join on null condition', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('profiles', (joinExp) => {
        joinExp.or((exp) => {
          exp.on('profiles.user_id', 'users.id').onNull('profiles.user_id')
        })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('profiles', (join) =>
        join.on((join1) => {
          join1.on('profiles.user_id', 'users.id').orOnNull('profiles.user_id')
        })
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.onNotNull', () => {
  test('apply join on not null condition', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('profiles', (joinExp) => {
        joinExp.or((exp) => {
          exp.on('profiles.user_id', 'users.id').onNotNull('profiles.user_id')
        })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('profiles', (join) =>
        join.on((join1) => {
          join1.on('profiles.user_id', 'users.id').orOnNotNull('profiles.user_id')
        })
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.onRaw', () => {
  test('apply join on condition as a raw query', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('profiles', (joinExp) => {
        joinExp.onRaw(client.raw('?? = ??', ['profiles.user_id', 'users.id']))
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('profiles', (join) => join.on('profiles.user_id', 'users.id'))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.onValue', () => {
  test('apply join on condition with a literal value', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)
    const date = new Date()

    const sql = query
      .from('users')
      .join('profiles', (joinExp) => {
        joinExp.onValue('profiles.is_social', false).onValue('profiles.completed_at', '<', date)
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('profiles', (join) =>
        join
          .on('profiles.is_social', knex.raw('?', [false]))
          .onVal('profiles.completed_at', '<', date)
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.onExists', () => {
  test('apply join on exists clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('exams', (joinExp) => {
        joinExp.onExists((q) => q.from('subjects').whereColumn('subjects.id', '=', 'exams.id'))
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('exams', (join) =>
        join.onExists((q) => q.from('subjects').where('subjects.id', '=', knex.ref('exams.id')))
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply join on exists clause in or group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('exams', (joinExp) => {
        joinExp.or((joinExp1) => {
          joinExp1
            .onExists((q) => q.from('subjects').whereColumn('subjects.id', '=', 'exams.id'))
            .onValue('exams.type', 'external')
        })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('exams', (join) =>
        join.on((join1) => {
          join1
            .onExists((q) => q.from('subjects').where('subjects.id', '=', knex.ref('exams.id')))
            .orOnVal('exams.type', 'external')
        })
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.onNotExists', () => {
  test('apply join on not exists clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('exams', (joinExp) => {
        joinExp.onNotExists((q) => q.from('subjects').whereColumn('subjects.id', '=', 'exams.id'))
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('exams', (join) =>
        join.onNotExists((q) => q.from('subjects').where('subjects.id', '=', knex.ref('exams.id')))
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply join on not exists clause in or group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('users')
      .join('exams', (joinExp) => {
        joinExp.or((joinExp1) => {
          joinExp1
            .onNotExists((q) => q.from('subjects').whereColumn('subjects.id', '=', 'exams.id'))
            .onValue('exams.type', 'external')
        })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('exams', (join) =>
        join.on((join1) => {
          join1
            .onNotExists((q) => q.from('subjects').where('subjects.id', '=', knex.ref('exams.id')))
            .orOnVal('exams.type', 'external')
        })
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.onBetween', () => {
  test('apply join on between clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const startDate = DateTime.local().startOf('month').toJSDate()
    const endDate = DateTime.local().endOf('month').toJSDate()

    const sql = query
      .from('users')
      .join('exams', (joinExp) => {
        joinExp.onBetween('exams.created_at', [startDate, endDate])
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('exams', (join) => join.onBetween('exams.created_at', [startDate, endDate]))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply join on between clause as subqueries', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('vehicles')
      .join('sales', (joinExp) => {
        joinExp.onBetween('sales.created_at', [
          (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
          (q) => q.from('promotions').select('ended_at').where('promotion_id', 1),
        ])
      })
      .toSQL()
    const knexSQL = knex
      .from('vehicles')
      .join('sales', (join) =>
        join.onBetween('sales.created_at', [
          (q: any) => q.from('promotions').select('started_at').where('promotion_id', 1),
          (q: any) => q.from('promotions').select('ended_at').where('promotion_id', 1),
        ])
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply join on between clause in or group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const startDate = DateTime.local().startOf('month').toJSDate()
    const endDate = DateTime.local().endOf('month').toJSDate()

    const sql = query
      .from('users')
      .join('exams', (joinExp) => {
        joinExp.or((joinExp1) => {
          joinExp1
            .onBetween('sales.created_at', [
              (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
              (q) => q.from('promotions').select('ended_at').where('promotion_id', 1),
            ])
            .onBetween('sales.created_at', [startDate, endDate])
        })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('exams', (join) =>
        join.on((join1) => {
          join1
            .onBetween('sales.created_at', [
              (q: any) => q.from('promotions').select('started_at').where('promotion_id', 1),
              (q: any) => q.from('promotions').select('ended_at').where('promotion_id', 1),
            ])
            .orOnBetween('sales.created_at', [startDate, endDate])
        })
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})

test.group('Select query builder | join.onNotBetween', () => {
  test('apply join on not between clause', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const startDate = DateTime.local().startOf('month').toJSDate()
    const endDate = DateTime.local().endOf('month').toJSDate()

    const sql = query
      .from('users')
      .join('exams', (joinExp) => {
        joinExp.onNotBetween('exams.created_at', [startDate, endDate])
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('exams', (join) => join.onNotBetween('exams.created_at', [startDate, endDate]))
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply join on not between clause as subqueries', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const sql = query
      .from('vehicles')
      .join('sales', (joinExp) => {
        joinExp.onNotBetween('sales.created_at', [
          (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
          (q) => q.from('promotions').select('ended_at').where('promotion_id', 1),
        ])
      })
      .toSQL()
    const knexSQL = knex
      .from('vehicles')
      .join('sales', (join) =>
        join.onNotBetween('sales.created_at', [
          (q: any) => q.from('promotions').select('started_at').where('promotion_id', 1),
          (q: any) => q.from('promotions').select('ended_at').where('promotion_id', 1),
        ])
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })

  test('apply join on not between clause in or group', ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    const client = connection.getQueryClient()
    const knex = connection.getReadClient()
    const query = new SelectQueryBuilder(client)

    const startDate = DateTime.local().startOf('month').toJSDate()
    const endDate = DateTime.local().endOf('month').toJSDate()

    const sql = query
      .from('users')
      .join('exams', (joinExp) => {
        joinExp.or((joinExp1) => {
          joinExp1
            .onNotBetween('sales.created_at', [
              (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
              (q) => q.from('promotions').select('ended_at').where('promotion_id', 1),
            ])
            .onNotBetween('sales.created_at', [startDate, endDate])
        })
      })
      .toSQL()
    const knexSQL = knex
      .from('users')
      .join('exams', (join) =>
        join.on((join1) => {
          join1
            .onNotBetween('sales.created_at', [
              (q: any) => q.from('promotions').select('started_at').where('promotion_id', 1),
              (q: any) => q.from('promotions').select('ended_at').where('promotion_id', 1),
            ])
            .orOnNotBetween('sales.created_at', [startDate, endDate])
        })
      )
      .toSQL()

    debug('%O', sql)
    assert.equal(sql.sql, knexSQL.sql)
    assert.deepEqual(sql.bindings, knexSQL.bindings)
    assert.equal(sql.method, knexSQL.method)
  })
})
