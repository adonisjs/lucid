'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/
/* global describe, it, before, after*/
const path = require('path')
const chai = require('chai')
const expect = chai.expect
const co = require('co')
const manageDb = require('./blueprints/manage')
const blueprint = require('./blueprints/model-blueprint')
const Database = require('../../src/Database')
const Model = require('../../src/Orm/Proxy/Model')
const StaticProxy = require('../../src/Orm/Proxy/Static')

process.env.TEST_PG = false
const queryAppender = process.env.TEST_PG === 'true' ? ' returning "id"' : ''

let Config = {
  get: function (name) {
    if (process.env.TEST_PG === 'true') {
      return {
        client: 'pg',
        connection: {
          host     : process.env.PG_HOST || 'localhost',
          user     : process.env.PG_USER || 'postgres',
          password : process.env.PG_PASSWORD || 'postgres',
          database : process.env.PG_DB || 'db',
          charset  : 'utf8'
        }
      }
    }
    else {
      return {
        client: 'sqlite3',
        connection: {
          filename: path.join(__dirname, './storage/model.sqlite3')
        },
        debug: false
      }
    }
  }
}

const db = new Database(Config)

describe('Model', function () {

  before(function (done) {
    manageDb
      .make(path.join(__dirname, './storage/model.sqlite3'))
      .then(function () {
        return blueprint.setup(db)
      })
      .then(function () {
        return blueprint.seed(db)
      }).then(function () {
        done()
      })
      .catch(done)
  })

  after(function (done) {
    blueprint
      .tearDown(db)
      .then(function () {
        return manageDb.remove(path.join(__dirname, './storage/model.sqlite3'))
      })
      .then(function () {
        done()
      }).catch(done)
  })

  it('should be an instance of Model', function () {
    class User extends Model {

      static get table() {
        return 'users'
      }
    }

    User.database = db; User = User.extend()
    const user = new User()
    expect(user instanceof Model).to.equal(true)
  })

  it('should be able to define properties as model attributes', function () {
    class User extends Model {

      static get table() {
        return 'users'
      }
    }

    User.database = db; User = User.extend()
    const user = new User()
    user.username = 'anku'
    expect(user.attributes.username).to.equal('anku')
  })

  it('should be able to write custom method using query chain' , function () {
    class User extends Model {

      active() {
        return this.where('status', 'active')
      }

    }
    User.database = db; User = User.extend()
    expect(User.active().toSQL().sql).to.equal('select * from "users" where "status" = ?')
  })

  it('should be able to define where clause as callback methods' , function (done) {
    class User extends Model {

    }
    User.database = db; User = User.extend()

    co(function *() {
      return yield User.where(function () {
        this.where('id', 1)
      }).fetch()
    }).then(function (user) {
      expect(user.first().id).to.equal(1)
      done()
    }).catch(done)
  })

  it('should be able to write scopedMethods and user defined query chain', function () {
    class User extends Model {

      scopeActive( query) {
        query.where('status', 'active')
      }

      scopeIsAdult( query) {
        query.where('age', '>', 22)
      }

    }

    User.database = db; User = User.extend()
    expect(User.active().isAdult().toSQL().sql).to.equal('select * from "users" where "status" = ? and "age" > ?')

  })

  it('should be able to pass arguments to query scopes', function () {
    class User extends Model {

      scopeOfType( query, status) {
        query.where('status', status)
      }

    }

    User.database = db; User = User.extend()
    const querySql = User.ofType('active').toSQL()
    expect(querySql.sql).to.equal('select * from "users" where "status" = ?')
    expect(querySql.bindings).deep.equal(['active'])
  })

  it('should be able to pass multiple arguments to query scopes', function () {
    class User extends Model {

      scopeOfType( query, status, status1) {
        query.where('status', status).orWhere('status', status1)
      }

    }

    User.database = db; User = User.extend()
    const querySql = User.ofType('active', 'inactive').toSQL()
    expect(querySql.sql).to.equal('select * from "users" where "status" = ? or "status" = ?')
    expect(querySql.bindings).deep.equal(['active', 'inactive'])
  })

  it('should be able to fetch model attributes', function () {
    class User extends Model {

      static get table() {
        return 'users'
      }

    }

    User.database = db; User = User.extend()
    const user = new User()
    user.username = 'anku'
    expect(user.attributes.username).to.equal(user.username)
  })

  it('should create row inside database using model attributes with create command', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get timestamps() {
        return false
      }

    }

    User.database = db; User = User.extend()
    const user = new User()
    user.username = 'anku'

    user
      .create()
      .then(function (response) {
        expect(response).to.be.an('array')
        expect(user.attributes.username).to.equal('anku')
        expect(user.attributes.id).to.equal(response[0])
        done()
      }).catch(done)
  })

  it('should be able to define getters while fetching values ', function (done) {
    let username = null

    class User extends Model {

      static get table() {
        return 'users'
      }

      getUsername( value) {
        return username = value.toUpperCase()
      }

    }

    User.database = db; User = User.extend()

    User
      .where('id', 1)
      .fetch()
      .then(function (values) {
        expect(values.first().username).to.equal(username)
        done()
      }).catch(done)
  })

  it('should be able to use getters when single row is returned from database', function (done) {
    let username = null

    class User extends Model {

      static get table() {
        return 'users'
      }

      getUsername( value) {
        return username = value.toUpperCase()
      }

    }

    User.database = db; User = User.extend()

    User
      .where('id', 1)
      .fetch()
      .then(function (values) {
        expect(values.first().username).to.equal(username)
        done()
      }).catch(done)
  })

  it('should be able to define setters while saving values' , function () {
    class User extends Model {

      static get table() {
        return 'users'
      }

      setUsername( value) {
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()
    const user = new User()

    user.username = 'AMAN'
    expect(user.username).to.equal('aman')
  })

  it('should be able to use setters when defined attributes inside constructor', function () {
    class User extends Model {

      static get table() {
        return 'users'
      }

      setUsername( value) {
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()

    const user = new User({username: 'AMAN'})
    expect(user.username).to.equal('aman')
  })

  it('should throw an error when trying to initiate model with bulk values', function () {
    class User extends Model {

      static get table() {
        return 'users'
      }

      setUsername( value) {
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()

    const fn = function () {
      return new User([{username: 'something'}, {username: 'someotherthing'}])
    }
    expect(fn).to.throw(/Cannot initiate model/)
  })

  it('should mutate values for those whose getters are defined' , function (done) {
    let oldUserName = null

    class User extends Model {

      getUsername( value) {
        oldUserName = value
        return value.toUpperCase()
      }

    }

    User.database = db
    User = User.extend()

    User
      .where('id', 1)
      .fetch()
      .then(function (user) {
        expect(user.first().username).to.equal(oldUserName.toUpperCase())
        done()
      }).catch(done)
  })

  it('should mutate values when initiating model using find method', function (done) {
    let oldUserName = null

    class User extends Model {
      getUsername( value) {
        oldUserName = value
        return value.toUpperCase()
      }
    }

    User.database = db
    User = User.extend()

    User
      .find(1)
      .then(function (user) {
        expect(user.username).to.equal(oldUserName.toUpperCase())
        done()
      }).catch(done)
  })

  it('should insert mutated values inside database using create method directly' , function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get timestamps() {
        return false
      }

      setUsername( value) {
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()
    const user = new User()

    let create =
    user
      .create({username: 'FOO'})
      .then(function (response) {
        expect(user.attributes.username).to.equal('foo')
        expect(user.attributes.id).to.equal(response[0])
        done()
      }).catch(done)
  })

  it('should not be able to create multiple users via user instance' , function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get timestamps() {
        return false
      }

      setUsername( value) {
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()
    const user = new User()

    let create =
    user
      .create([{username: 'FOO'}, {username: 'BAR'}])
      .then(function (response) {
        done()
      }).catch(function (error) {
      expect(error.message).to.match(/cannot persist model with multiple rows/)
      done()
    })
  })

  it('should insert mutated values inside database using static create method', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get timestamps() {
        return false
      }

      setUsername( value) {
        return value.toLowerCase()
      }

    }

    User.database = db; User = User.extend()
    User
      .create([{username: 'UNICORN'}, {username: 'SPARK'}])
      .then(function () {
        return User.where('username', 'unicorn').orWhere('username', 'spark').fetch()
      })
      .then(function (users) {
        expect(users.size()).to.equal(2)
        done()
      })
      .catch(done)
  })

  it('should return instance of model , when using static find method' , function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

    }

    User.database = db; User = User.extend()

    User
      .find(1)
      .then(function (user) {
        expect(user instanceof User).to.equal(true)
        done()
      }).catch(done)
  })

  it('should return instance of model using static find method and should be able to update properties using instance', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }
    }

    User.database = db; User = User.extend()

    User
      .find(1)
      .then(function (user) {
        user.username = 'amanvirk'
        return user.update()
      })
      .then(function (response) {
        expect(parseInt(response[0])).to.equal(1)
        done()
      })
      .catch(done)
  })

  it('should return row primaryKey after update' , function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get timestamps() {
        return false
      }
    }

    User.database = db; User = User.extend()
    User
      .update({username: 'foo'})
      .then(function (user) {
        expect(user).to.be.an('array')
        done()
      })
      .catch(done)
  })

  it('should be able to update values when using model instance and should not re mutate values' , function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      setDisplayName( value) {
        return 'bar-' + value
      }

    }

    User.database = db; User = User.extend()
    User
      .find(2)
      .then(function (user) {
        console.log(user.attributes)
        user.displayName = 'baz'
        return user.update()
      })
      .then(function (response) {
        expect(parseInt(response[0])).to.be.a('number')
        done()
      }).catch(done)
  })

  it('should be able to use soft deletes ', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get softDeletes() {
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
      .where('id', 1)
      .fetch()
      .then(function (result) {
        expect(result.first().deleted_at).to.equal(null)
        done()
      }).catch(done)
  })

  it('should be able to use soft deletes when using orWhere clauses inside closure', function (done) {
    class User extends Model {
    }

    User.database = db
    User = User.extend()

    User
      .where(function () {
        this.where('id', 11).orWhere('status', 'inactive')
      })
      .fetch()
      .then(function (result) {
        expect(result.size()).to.equal(0)
        done()
      }).catch(done)
  })

  it('should return empty collection when deleted_at is mentioned', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get softDeletes() {
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
      .where('id', 11)
      .fetch()
      .then(function (result) {
        expect(result.size()).to.equal(0)
        done()
      }).catch(done)
  })

  it('should fetch soft deleted values when soft deletes have been disabled', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get softDeletes() {
        return false
      }

    }

    User.database = db; User = User.extend()

    User
      .where('id', 3)
      .fetch()
      .then(function (result) {
        expect(result.first().id).to.equal(3)
        done()
      }).catch(done)
  })

  it('should be able to fetch trashed items when using soft deletes', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get softDeletes() {
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
      .withTrashed()
      .where('id', 3)
      .fetch()
      .then(function (result) {
        expect(result.first().id).to.equal(3)
        done()
      }).catch(done)
  })

  it('should be able to find value using primary key even when soft deletes are on', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get softDeletes() {
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
      .find(11)
      .then(function (user) {
        expect(user.deleted_at).not.to.equal(null)
        done()
      })
      .catch(done)
  })

  it('should be able to find where model instance is trashed or not', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }

      static get softDeletes() {
        return 'deleted_at'
      }

    }

    User.database = db; User = User.extend()

    User
      .find(3)
      .then(function (user) {
        expect(user.isTrashed()).to.equal(true)
        done()
      })
      .catch(done)
  })

  it('should be soft delete rows when softDeletes is on', function () {
    class User extends Model {

      static get table() {
        return 'users'
      }

    }

    User.database = db; User = User.extend()

    const deleteQuery = User.where('id', 2).delete().toSQL()
    expect(deleteQuery.sql).to.equal('update "users" set "deleted_at" = ? where "id" = ?')
  })

  it('should forceDelete rows even if softDeletes is enabled', function () {
    class User extends Model {

      static get table() {
        return 'users'
      }

    }

    User.database = db; User = User.extend()

    const deleteQuery = User.where('id', 2).forceDelete().toSQL()
    expect(deleteQuery.sql).to.equal('delete from "users" where "id" = ?')
    expect(deleteQuery.bindings).deep.equal([2])
  })

  it('should be able to soft delete model instance', function (done) {
    class User extends Model {

      static get table() {
        return 'users'
      }
    }

    User.database = db; User = User.extend()

    User
      .find(1)
      .then(function (user) {
        let deleteQuery = user.delete().toSQL().sql
        expect(deleteQuery).to.equal('update "users" set "deleted_at" = ? where "id" = ?')
        done()
      }).catch(done)
  })

  it('should be able to make table name when not mentioned', function () {
    class User extends Model {

    }

    User.database = db; User = User.extend()
    expect(User.table).to.equal('users')
  })

  it('should work without defining any attributes on model', function () {
    class User extends Model {

    }

    User.database = db; User = User.extend()
    expect(User.table).to.equal('users')
    expect(User.softDeletes).to.equal('deleted_at')
    expect(User.timestamps).to.equal(true)
  })

  it('should be able to define hidden fields , which will be excluded from results' , function (done) {
    class User extends Model {

      static get hidden() {
        return ['email']
      }

    }

    User.database = db; User = User.extend()

    User
      .where('id', 1)
      .fetch()
      .then(function (user) {
        expect(user.first().email).to.equal(undefined)
        done()
      }).catch(done)
  })

  it('should be able to define visible fields , which should get preference over hidden fields' , function (done) {
    class User extends Model {

      static get hidden() {
        return ['email']
      }

      static get visible() {
        return ['age']
      }

    }

    User.database = db; User = User.extend()

    User
      .where('id', 1)
      .fetch()
      .then(function (user) {
        expect(user.first().username).to.equal(undefined)
        expect(user.first().age).to.be.a('number')
        done()
      }).catch(done)
  })

  it('should not be able to update a model if it was not fetched ', function () {
    class User extends Model {
    }

    User.database = db; User = User.extend()
    const user = new User()

    const fn = function () {
      return user.update()
    }

    expect(fn).to.throw(/You cannot update/)
  })

  it('should not be able to delete a model if it was not fetched ', function () {
    class User extends Model {
    }

    User.database = db; User = User.extend()
    const user = new User()

    const fn = function () {
      return user.delete()
    }

    expect(fn).to.throw(/You cannot delete/)
  })

  it('should not be able to forceDelete a model if it was not fetched ', function () {
    class User extends Model {
    }

    User.database = db; User = User.extend()
    const user = new User()

    const fn = function () {
      return user.forceDelete()
    }

    expect(fn).to.throw(/You cannot delete/)
  })

  it('should not use existing query chain , when values for one is fetched', function (done) {
    class User extends Model {
    }

    let user1 = []

    User.database = db; User = User.extend()

    User
      .where('id', 1)
      .fetch()
      .then(function (user) {
        user1 = user
        return User.where('id', 2).fetch()
      })
      .then(function (user) {
        expect(user1.first().id).to.equal(1)
        expect(user.first().id).to.equal(2)
        done()
      })
      .catch(done)
  })

  it('should not use existing query chain , when new function is used while building another query' , function () {
    class User extends Model {
    }

    User.database = db; User = User.extend()

    let user1 = User.where('id', 1)
    let user2 = User.new().where('id', 2)

    expect(user1.toSQL().sql).to.equal('select * from "users" where "id" = ?')
    expect(user2.toSQL().sql).to.equal('select * from "users" where "id" = ?')
  })

  it('should return object when used first method on query chain', function (done) {
    class User extends Model {

    }
    User.database = db; User = User.extend()

    User
      .where('id', 1)
      .first()
      .fetch()
      .then(function (user) {
        expect(user.toJSON().username).not.to.equal(undefined)
        done()
      }).catch(done)
  })
})
