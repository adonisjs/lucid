'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const chance = require('chance').Chance()
const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const { Config } = require('@adonisjs/sink')
const Database = require('../../src/Database')
const DatabaseManager = require('../../src/Database/Manager')
const helpers = require('./helpers')

test.group('Database | QueryBuilder', (group) => {
  group.before(async () => {
    await fs.ensureDir(path.join(__dirname, './tmp'))
    this.database = new Database(helpers.getConfig())
    await helpers.createTables(this.database)
  })

  group.afterEach(async () => {
    await Promise.all([
      this.database.truncate('users'),
      this.database.truncate('profiles'),
      this.database.truncate('my_users')
    ])
  })

  group.after(async () => {
    await helpers.dropTables(this.database)
    this.database.close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('get instance of query builder', (assert) => {
    const queryBuilder = this.database.query()
    assert.property(queryBuilder, 'client')
  })

  test('proxy query builder methods', (assert) => {
    const selectQuery = this.database.from('users').toSQL()
    assert.equal(selectQuery.sql, helpers.formatQuery('select * from "users"'))
  })

  test('prefix table when defined inside config', (assert) => {
    const dbConfig = helpers.getConfig()
    dbConfig.prefix = 'my_'

    const selectQuery = new Database(dbConfig).from('users').toSQL()
    assert.equal(selectQuery.sql, helpers.formatQuery('select * from "my_users"'))
  })

  test('ignore prefix at runtime', (assert) => {
    const dbConfig = helpers.getConfig()
    dbConfig.prefix = 'my_'

    const selectQuery = new Database(dbConfig).withOutPrefix().from('users').toSQL()
    assert.equal(selectQuery.sql, helpers.formatQuery('select * from "users"'))
  })

  test('create a raw query', (assert) => {
    const selectQuery = this.database.raw(helpers.formatQuery('select * from "users"'))
    assert.equal(selectQuery.sql, helpers.formatQuery('select * from "users"'))
  })

  test('create db transactions', async (assert) => {
    const trx = await this.database.beginTransaction()
    assert.isDefined(trx)
    trx.rollback()
  })

  test('commit transactions', async (assert) => {
    const trx = await this.database.beginTransaction()
    await trx.table('users').insert({ username: 'virk' })
    await trx.commit()
    const firstUser = await this.database.table('users').first()
    assert.equal(firstUser.username, 'virk')
  })

  test('rollback transactions', async (assert) => {
    const trx = await this.database.beginTransaction()
    await trx.table('users').insert({ username: 'virk' })
    trx.rollback()
    const users = await this.database.table('users')
    assert.lengthOf(users, 0)
  })

  test('transaction should not collide with other queries', async (assert) => {
    const trx = await this.database.beginTransaction()
    setTimeout(() => {
      trx.rollback()
    }, 20)
    await this.database.table('users').insert({ username: 'virk' })
    const users = await this.database.table('users')
    assert.lengthOf(users, 1)
  })

  test('create global transactions', async (assert) => {
    await this.database.beginGlobalTransaction()
    await this.database.table('users').insert({ username: 'virk' })
    const users = await this.database.table('users')
    assert.lengthOf(users, 1)
    await this.database.rollbackGlobalTransaction()
    const usersAfterRollback = await this.database.table('users')
    assert.lengthOf(usersAfterRollback, 0)
  })

  test('commit global transactions', async (assert) => {
    await this.database.beginGlobalTransaction()
    await this.database.table('users').insert({ username: 'virk' })
    await this.database.commitGlobalTransaction()
    const users = await this.database.table('users')
    assert.lengthOf(users, 1)
  })

  test('destroy database connection', async (assert) => {
    await this.database.close()
    assert.plan(1)
    try {
      await this.database.table('users')
    } catch ({ message }) {
      assert.equal(message, 'Unable to acquire a connection')
      this.database = new Database(helpers.getConfig())
    }
  })

  test('add orderBy and limit clause using forPage method', async (assert) => {
    const query = this.database.table('users').forPage(1).toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users" limit ?'))
    assert.deepEqual(query.bindings, [20])
  })

  test('add orderBy and limit clause using forPage greater than 1', async (assert) => {
    const query = this.database.table('users').forPage(3).toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users" limit ? offset ?'))
    assert.deepEqual(query.bindings, [20, 40])
    await this.database.table('users').truncate()
  })

  test('paginate results', async (assert) => {
    const users = _.map(_.range(10), () => {
      return { username: chance.word() }
    })
    await this.database.insert(users).into('users')
    const result = await this.database.table('users').orderBy('username').paginate(1, 5)
    assert.equal(result.perPage, 5)
    assert.equal(result.total, 10)
    assert.equal(result.page, 1)
    assert.equal(result.lastPage, 2)
    assert.isAtMost(result.data.length, result.perPage)
    await this.database.table('users').truncate()
  })

  test('paginate results when records are less than perPage', async (assert) => {
    const users = _.map(_.range(4), () => {
      return { username: chance.word() }
    })
    await this.database.insert(users).into('users')
    const result = await this.database.table('users').orderBy('username').paginate(1, 5)
    assert.equal(result.perPage, 5)
    assert.equal(result.total, 4)
    assert.equal(result.page, 1)
    assert.equal(result.lastPage, 1)
    assert.isAtMost(result.data.length, result.perPage)
    await this.database.table('users').truncate()
  })

  test('paginate data inside transactions', async (assert) => {
    const trx = await this.database.beginTransaction()
    assert.equal(typeof (trx.table('users').paginate), 'function')
    trx.rollback()
  })

  test('throw exception when proxy property is not a method', (assert) => {
    const fn = () => this.database.foo()
    assert.throw(fn, 'Database.foo is not a function')
  })

  test('database.transaction should work', async (assert) => {
    await this.database.transaction(function (trx) {
      return trx.table('users').insert({ username: 'virk' })
    })
    const firstUser = await this.database.table('users').first()
    assert.equal(firstUser.username, 'virk')
  })

  test('aggregate functions', async (assert) => {
    await this.database.insert({ user_id: 1, country_id: 1, profile_name: 'u1', likes: 5 }).into('profiles')
    await this.database.insert({ user_id: 1, country_id: 2, profile_name: 'u2', likes: 10 }).into('profiles')
    await this.database.insert({ user_id: 1, country_id: 2, profile_name: 'u3', likes: 10 }).into('profiles')

    let c1 = 0
    let c2 = 0

    let q = this.database.table('profiles').select('country_id').sum('likes as like_total').groupBy('country_id')

    c1 = (await q)
    c2 = await q.getCount()

    const firstRow = c1[0].country_id === 1 ? c1[0] : c1[1]
    const secondRow = c1[0].country_id === 1 ? c1[1] : c1[0]

    assert.equal(c1.length, 2)
    assert.equal(c2, 2, 'There should be 2 rows counted')
    assert.equal(firstRow.country_id, 1)
    assert.equal(firstRow.like_total, helpers.formatNumber(5))
    assert.equal(secondRow.country_id, 2)
    assert.equal(secondRow.like_total, helpers.formatNumber(20))

    c1 = (await this.database.table('profiles').count('likes as total'))[0].total
    c2 = await this.database.table('profiles').getCount()
    assert.equal(c1, 3)
    assert.equal(c2, 3)

    c1 = (await this.database.table('profiles').countDistinct('likes as total'))[0].total
    c2 = await this.database.table('profiles').getCountDistinct('likes')
    assert.equal(c1, 2)
    assert.equal(c2, 2)

    c1 = (await this.database.table('profiles').avg('likes as total'))[0].total
    c2 = await this.database.table('profiles').getAvg('likes')
    assert.equal(parseInt(c1), parseInt(25 / 3))
    assert.equal(parseInt(c2), parseInt(25 / 3))

    c1 = (await this.database.table('profiles').avgDistinct('likes as total'))[0].total
    c2 = await this.database.table('profiles').getAvgDistinct('likes')
    assert.equal(parseInt(c1), parseInt(15 / 2))
    assert.equal(parseInt(c2), parseInt(15 / 2))

    try {
      await this.database.table('profiles').getAvg()
      assert.fail('success', 'exception')
    } catch (err) {
      assert.equal(err.message, "'getAvg' requires a column name.")
    }

    c1 = (await this.database.table('profiles').sum('likes as total'))[0].total
    c2 = await this.database.table('profiles').getSum('likes')
    assert.equal(c1, 25)
    assert.equal(c2, 25)

    c1 = (await this.database.table('profiles').sumDistinct('likes as total'))[0].total
    c2 = await this.database.table('profiles').getSumDistinct('likes')
    assert.equal(c1, 15)
    assert.equal(c2, 15)

    c1 = (await this.database.table('profiles').min('likes as total'))[0].total
    c2 = await this.database.table('profiles').getMin('likes')
    assert.equal(c1, 5)
    assert.equal(c2, 5)

    c1 = (await this.database.table('profiles').max('likes as total'))[0].total
    c2 = await this.database.table('profiles').getMax('likes')
    assert.equal(c1, 10)
    assert.equal(c2, 10)
  })

  test('return the latest record from the database', async (assert) => {
    const users = [
      { username: 'virk' },
      { username: 'romain' }
    ]
    await this.database.insert(users).into('users')

    const user = await this.database.table('users').last()
    assert.equal(user.username, 'romain')
  })

  test('return the latest record from the database via username field', async (assert) => {
    const users = [
      { username: 'romain' },
      { username: 'virk' }
    ]
    await this.database.insert(users).into('users')

    const user = await this.database.table('users').last('username')
    assert.equal(user.username, 'virk')
  })

  test('run raw query inside global transactions', async (assert) => {
    try {
      await this.database.beginGlobalTransaction()
      await this.database.table('users').insert({ username: 'virk' })
      const users = await this.database.raw('select * from users')
      assert.exists(users)
      await this.database.rollbackGlobalTransaction()
    } catch (error) {
      await this.database.rollbackGlobalTransaction()
      throw error
    }
  })

  test('run raw query as a subquery global transactions', async (assert) => {
    try {
      await this.database.beginGlobalTransaction()
      await this.database.table('users').insert({ username: 'virk' })
      const users = await this.database.select(this.database.raw('count(*) as users_count'))
      assert.exists(users)
      await this.database.rollbackGlobalTransaction()
    } catch (error) {
      await this.database.rollbackGlobalTransaction()
      throw error
    }
  })
})

test.group('Database | Manager', () => {
  test('get instance of database using connection method', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: helpers.getConfig()
    })
    const db = new DatabaseManager(config).connection()
    assert.instanceOf(db, Database)
  })

  test('throw exception when unable to connect to database', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: {}
    })
    const db = () => new DatabaseManager(config).connection()
    assert.throw(db, 'knex: Required configuration option \'client\' is missing')
  })

  test('throw exception when connection does not exists', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: {}
    })
    const db = () => new DatabaseManager(config).connection('foo')
    assert.throw(db, 'E_MISSING_DB_CONNECTION: Missing database connection {foo}. Make sure you define it inside config/database.js file')
  })

  test('proxy database methods', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: helpers.getConfig()
    })
    const query = new DatabaseManager(config).table('users').toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users"'))
  })

  test('proxy database properties', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: helpers.getConfig()
    })
    assert.isNull(new DatabaseManager(config)._globalTrx)
  })

  test('reuse existing database connection', (assert) => {
    const config = new Config()
    config.set('database', {
      connection: 'testing',
      testing: helpers.getConfig()
    })
    const dbManager = new DatabaseManager(config)
    dbManager.connection()
    assert.lengthOf(Object.keys(dbManager._connectionPools), 1)

    dbManager.connection()
    assert.lengthOf(Object.keys(dbManager._connectionPools), 1)
  })
})
