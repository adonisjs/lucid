'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it, beforeEach, after, before */
const Database = require('../../src/Database')
const chai = require('chai')
const filesFixtures = require('./fixtures/files')
const modelFixtures = require('./fixtures/model')
const config = require('./helpers/config')
const queryHelpers = require('./helpers/query')
const expect = chai.expect
require('co-mocha')

describe('Database provider', function () {
  beforeEach(function () {
    Database.close()
  })

  before(function * () {
    Database._setConfigProvider(config)
    yield filesFixtures.createDir()
    yield modelFixtures.up(Database)
  })

  after(function * () {
    yield modelFixtures.down(Database)
    yield modelFixtures.down(Database.connection('alternateConnection'))
    Database.close()
  })

  it('should set config provider', function () {
    Database._setConfigProvider(config)
    const settings = Database._resolveConnectionKey('sqlite3')
    expect(settings).to.equal('sqlite3')
  })

  it('should setup a knex instance of default connection', function () {
    Database._setConfigProvider(config)
    const instance = Database.table('users')
    expect(instance.client.config.client).to.equal(process.env.DB)
  })

  it('should throw an error when unable to find connection property on config object', function () {
    const Config = {
      get: function () {
        return null
      }
    }
    Database._setConfigProvider(Config)
    const fn = function () {
      Database.where()
    }
    expect(fn).to.throw('InvalidArgumentException: E_MISSING_CONFIG: Make sure to define a connection inside the database config file')
  })

  it('should throw an error when unable to find connection settings using connection key', function () {
    const Config = {
      get: function (key) {
        if (key === 'database.connection') {
          return 'sqlite'
        }
        return null
      }
    }
    Database._setConfigProvider(Config)
    const fn = function () {
      Database.where()
    }
    expect(fn).to.throw('InvalidArgumentException: E_MISSING_CONFIG: Unable to get database client configuration for sqlite')
  })

  it('should reuse the old pool if exists', function () {
    Database._setConfigProvider(config)
    Database.table('users')
    Database.table('accounts')
    const pools = Database.getConnectionPools()
    expect(Object.keys(pools).length).to.equal(1)
  })

  it('should reuse the same connection when default connection is same as the named connection', function () {
    Database._setConfigProvider(config)
    Database.table('users')
    Database.connection(process.env.DB).table('accounts')
    const pools = Database.getConnectionPools()
    expect(Object.keys(pools).length).to.equal(1)
  })

  it('should be able to chain all knex methods', function () {
    Database._setConfigProvider(config)
    const sql = Database.table('users').where('username', 'bar').toSQL().sql
    expect(sql).to.equal(queryHelpers.formatQuery('select * from "users" where "username" = ?'))
  })

  it('should not use global scope for query chain', function () {
    Database._setConfigProvider(config)
    const user = Database.table('users').where('username', 'foo')
    const accounts = Database.table('accounts').where('id', 1)
    expect(user.toSQL().sql).to.equal(queryHelpers.formatQuery('select * from "users" where "username" = ?'))
    expect(accounts.toSQL().sql).to.equal(queryHelpers.formatQuery('select * from "accounts" where "id" = ?'))
  })

  it('should spawn a new connection pool when connection method is used', function () {
    Database._setConfigProvider(config)
    Database.select()
    const instance = Database.connection('alternateConnection')
    expect(Object.keys(Database.getConnectionPools()).length).to.equal(2)
    expect(instance.client.config.client).not.equal(undefined)
  })

  it('should be able to chain query incrementally', function () {
    Database._setConfigProvider(config)
    const user = Database.table('users')
    user.where('age', 22)
    user.where('username', 'virk')
    expect(user.toSQL().sql).to.equal(queryHelpers.formatQuery('select * from "users" where "age" = ? and "username" = ?'))
  })

  it('should close a given connection', function () {
    Database._setConfigProvider(config)
    Database.table('users')
    Database.connection('alternateConnection')
    Database.close('default')
    expect(Object.keys(Database.getConnectionPools()).length).to.equal(1)
  })

  it('should close all connection', function () {
    Database._setConfigProvider(config)
    Database.table('users')
    Database.connection('alternateConnection')
    Database.close()
    expect(Object.keys(Database.getConnectionPools()).length).to.equal(0)
  })

  it('should be able to create lean transactions', function * () {
    const trx = yield Database.beginTransaction()
    yield trx.table('users').insert({username: 'db-trx'})
    trx.commit()
    const user = yield Database.table('users').where('username', 'db-trx')
    expect(user).to.be.an('array')
    expect(user[0].username).to.equal('db-trx')
  })

  it('should be able to rollback transactions', function * () {
    const trx = yield Database.beginTransaction()
    yield trx.table('users').insert({username: 'db-trx1'})
    trx.rollback()
    const user = yield Database.table('users').where('username', 'db-trx1')
    expect(user).to.be.an('array')
    expect(user.length).to.equal(0)
  })

  it('should be able to have multiple transactions', function * () {
    const trx = yield Database.beginTransaction()
    yield trx.table('users').insert({username: 'multi-trx'})
    trx.commit()

    const trx1 = yield Database.beginTransaction()
    yield trx1.table('users').insert({username: 'multi-trx1'})
    trx1.rollback()

    const user = yield Database.table('users').where('username', 'multi-trx')
    const user1 = yield Database.table('users').where('username', 'multi-trx1')
    expect(user).to.be.an('array')
    expect(user1).to.be.an('array')
    expect(user.length).to.equal(1)
    expect(user1.length).to.equal(0)
  })

  it('should be able to call beginTransaction to a different connection', function * () {
    yield modelFixtures.up(Database.connection('alternateConnection'))
    const trx = yield Database.connection('alternateConnection').beginTransaction()
    yield trx.table('users').insert({username: 'conn2-trx'})
    trx.commit()

    const user = yield Database.connection('alternateConnection').table('users').where('username', 'conn2-trx')
    expect(user).to.be.an('array')
    expect(user.length).to.equal(1)
  })

  it('should be able to commit transactions automatically', function * () {
    const response = yield Database.transaction(function * (trx) {
      return yield trx.table('users').insert({username: 'auto-trx'}).returning('id')
    })
    expect(response).to.be.an('array')
    expect(response.length).to.equal(1)
  })

  it('should rollback transactions automatically on error', function * () {
    try {
      yield Database.transaction(function * (trx) {
        return yield trx.table('users').insert({u: 'auto-trx'})
      })
      expect(true).to.equal(false)
    } catch (e) {
      expect(e.message).not.equal(undefined)
    }
  })

  it('should be able to run transactions on different connection', function * () {
    yield Database.connection('alternateConnection').transaction(function * (trx) {
      return yield trx.table('users').insert({username: 'different-trx'})
    })
    const user = yield Database.connection('alternateConnection').table('users').where('username', 'different-trx')
    expect(user).to.be.an('array')
    expect(user[0].username).to.equal('different-trx')
  })

  it('should be able to paginate results', function * () {
    const paginatedUsers = yield Database.table('users').paginate(1)
    expect(paginatedUsers).to.have.property('total')
    expect(paginatedUsers).to.have.property('lastPage')
    expect(paginatedUsers).to.have.property('perPage')
    expect(paginatedUsers).to.have.property('data')
    expect(paginatedUsers.total).to.equal(paginatedUsers.data.length)
  })

  it('should throw an error when page is not passed', function * () {
    try {
      yield Database.table('users').paginate()
      expect(true).to.equal(false)
    } catch (e) {
      expect(e.message).to.match(/cannot paginate results for page less than 1/)
    }
  })

  it('should throw an error when page equals 0', function * () {
    try {
      yield Database.table('users').paginate(0)
      expect(true).to.equal(false)
    } catch (e) {
      expect(e.message).to.match(/cannot paginate results for page less than 1/)
    }
  })

  it('should return proper meta data when paginate returns zero results', function * () {
    const paginatedUsers = yield Database.table('users').where('status', 'published').paginate(1)
    expect(paginatedUsers.total).to.equal(0)
    expect(paginatedUsers.lastPage).to.equal(0)
  })

  it('should return proper meta data when there are results but page is over the last page', function * () {
    const paginatedUsers = yield Database.table('users').paginate(10)
    expect(paginatedUsers.total).to.equal(3)
    expect(paginatedUsers.lastPage).to.equal(1)
  })

  it('should be able paginate results using order by on the original query', function * () {
    const paginatedUsers = yield Database.table('users').orderBy('id', 'desc').paginate(1)
    expect(paginatedUsers).to.have.property('total')
    expect(paginatedUsers).to.have.property('lastPage')
    expect(paginatedUsers).to.have.property('perPage')
    expect(paginatedUsers).to.have.property('data')
    expect(paginatedUsers.total).to.equal(paginatedUsers.data.length)
  })

  it('should be able to get results in chunks', function * () {
    let callbackCalledForTimes = 0
    const allUsers = yield Database.table('users')
    yield Database.table('users').chunk(1, function (user) {
      expect(user[0].id).to.equal(allUsers[callbackCalledForTimes].id)
      callbackCalledForTimes++
    })
    expect(callbackCalledForTimes).to.equal(allUsers.length)
  })

  it('should be able to prefix the database table using a configuration option', function * () {
    Database._setConfigProvider(config.withPrefix)
    const query = Database.table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users"'))
  })

  it('should be able to prefix the database table when table method is called after other methods', function * () {
    const query = Database.where('username', 'foo').table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })

  it('should be able to prefix the database table when from method is used', function * () {
    const query = Database.from('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users"'))
  })

  it('should be able to prefix the database table when from method is called after other methods', function * () {
    const query = Database.where('username', 'foo').from('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })

  it('should be able to prefix the database table when into method is used', function * () {
    const query = Database.into('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users"'))
  })

  it('should be able to prefix the database table when into method is called after other methods', function * () {
    const query = Database.where('username', 'foo').into('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })

  it('should be able to remove the prefix using the withoutPrefix method', function * () {
    const query = Database.withoutPrefix().table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "users"'))
  })

  it('should be able to remove the prefix when withoutPrefix method is called after other methods', function * () {
    const query = Database.where('username', 'foo').withoutPrefix().table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "users" where "username" = ?'))
  })

  it('should be able to change the prefix using the withPrefix method', function * () {
    const query = Database.withPrefix('k_').table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "k_users"'))
  })

  it('should be able to remove the prefix when withPrefix method is called after other methods', function * () {
    const query = Database.where('username', 'foo').withPrefix('k_').table('users').toSQL()
    expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "k_users" where "username" = ?'))
  })

  it('should not mess the query builder instance when withPrefix is called on multiple queries at same time', function * () {
    const query = Database.where('username', 'foo').withPrefix('k_').table('users')
    const query1 = Database.where('username', 'foo').table('users')
    expect(queryHelpers.formatQuery(query.toSQL().sql)).to.equal(queryHelpers.formatQuery('select * from "k_users" where "username" = ?'))
    expect(queryHelpers.formatQuery(query1.toSQL().sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })

  it('should not mess the query builder instance when withoutPrefix is called on multiple queries at same time', function * () {
    const query = Database.where('username', 'foo').withoutPrefix().table('users')
    const query1 = Database.where('username', 'foo').table('users')
    expect(queryHelpers.formatQuery(query.toSQL().sql)).to.equal(queryHelpers.formatQuery('select * from "users" where "username" = ?'))
    expect(queryHelpers.formatQuery(query1.toSQL().sql)).to.equal(queryHelpers.formatQuery('select * from "ad_users" where "username" = ?'))
  })
})
