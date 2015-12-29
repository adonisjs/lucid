'use strict'

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const co = require('co')
const manageDb = require('./blueprints/manage')
const blueprint = require('./blueprints/model-blueprint')
const Database = require('../../src/Database')
const StaticProxy = require('../../src/Orm/Proxy/Static')

let Config = {
  get: function (name) {
    return {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, './storage/proxy.sqlite3')
      },
      debug: false
    }
  }
}

const db = new Database(Config)

describe('StaticProxy', function () {
  before(function (done) {
    manageDb
      .make(path.join(__dirname, './storage/proxy.sqlite3'))
      .then(function () {
        return blueprint.setup(db)
      })
      .then(function () {
        blueprint.seed(db)
      })
      .then(function () {
        done()
      })
      .catch(done)
  })

  after(function (done) {
    blueprint
      .tearDown(db)
      .then(function () {
        return manageDb.remove(path.join(__dirname, './storage/proxy.sqlite3'))
      })
      .then(function () {
        done()
      }).catch(done)
  })

  it('should proxy class static methods', function () {
    class User {

      static extend() {
        return new StaticProxy(this, db)
      }

      static get table() {
        return 'users'
      }

    }

    User = User.extend()
    expect(User.activeConnection.client.config.client).to.equal('sqlite3')

  })

  it('should call methods directly on query builder', function () {
    class User {

      static extend() {
        return new StaticProxy(this, db)
      }

      static get table() {
        return 'users'
      }

    }

    User = User.extend()
    expect(User.select('*').toSQL().sql).to.equal('select * from "users"')

  })

  it('should return an instance of collection on values fetched from model queries', function (done) {
    class User {

      static extend() {
        return new StaticProxy(this, db)
      }

      static get database() {
        return this._database
      }

      static set database( value) {
        this._database = value
      }

      static get table() {
        return 'users'
      }
    }

    User.database = db
    User = User.extend()

    User
      .select('*')
      .first()
      .fetch()
      .then(function (users) {
        expect(users.__actions__).deep.equal([])
        done()
      }).catch(done)
  })

  it('should allow scoped methods on class', function () {
    class User {

      static extend() {
        return new StaticProxy(this, db)
      }
      static get table() {
        return 'users'
      }

      scopeActive( query) {
        return query.where('status', 'active')
      }

    }

    User = User.extend()
    User.active()
    expect(User.toSQL().sql).to.equal('select * from "users" where "status" = ?')
    expect(User.toSQL().bindings).deep.equal(['active'])

  })

})
