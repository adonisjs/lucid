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

  group.after(async () => {
    await helpers.dropTables(this.database)
    await fs.remove(path.join(__dirname, './tmp'))
  })

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
    trx.commit()
    const firstUser = await this.database.table('users').first()
    assert.equal(firstUser.username, 'virk')
    await this.database.truncate('users')
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
    await this.database.truncate('users')
  })

  test('create global transactions', async (assert) => {
    await this.database.beginGlobalTransaction()
    await this.database.table('users').insert({ username: 'virk' })
    this.database.rollbackGlobalTransaction()
    const users = await this.database.table('users')
    assert.lengthOf(users, 0)
  })

  test('commit global transactions', async (assert) => {
    await this.database.beginGlobalTransaction()
    await this.database.table('users').insert({ username: 'virk' })
    this.database.commitGlobalTransaction()
    const users = await this.database.table('users')
    assert.lengthOf(users, 1)
    await this.database.truncate('users')
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
    assert.equal(typeof(trx.table('users').paginate), 'function')
    trx.rollback()
  })

  test('throw exception when proxy property is not a method', (assert) => {
    const fn = () => this.database.foo()
    assert.throw(fn, 'Database.foo is not a function')
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
