'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it, after, before, context */
const Model = require('../../src/Lucid/Model')
const Database = require('../../src/Database')
const chai = require('chai')
const moment = require('moment')
const path = require('path')
const Ioc = require('adonis-fold').Ioc
const expect = chai.expect
const NE = require('node-exceptions')
const co = require('co')
const filesFixtures = require('./fixtures/files')
const modelFixtures = require('./fixtures/model')
const QueryBuilder = require('../../src/Lucid/QueryBuilder')
const config = require('./helpers/config')
const queryHelpers = require('./helpers/query')
require('co-mocha')

describe('Lucid', function () {
  before(function * () {
    Database._setConfigProvider(config)
    Ioc.bind('Adonis/Src/Database', function () {
      return Database
    })
    yield filesFixtures.createDir()
    yield modelFixtures.up(Database)
    Ioc.autoload('App', path.join(__dirname, './app'))
  })

  after(function * () {
    yield modelFixtures.down(Database)
    Database.close()
  })

  context('Model', function () {
    it('should return model boot state as undefined', function () {
      class User extends Model {}
      expect(User.$booted).to.equal(undefined)
    })

    it('should set model boot state to true when boot method is called', function () {
      class User extends Model {}
      User.bootIfNotBooted()
      expect(User.$booted).to.equal(true)
    })

    it('should not boot model multiple times', function () {
      let bootCounts = 0
      class User extends Model {
        static boot () {
          super.boot()
          bootCounts++
        }
      }
      User.bootIfNotBooted()
      User.bootIfNotBooted()
      User.bootIfNotBooted()
      expect(bootCounts).to.equal(1)
    })

    it('should make no effect on sibling models once boot method is called', function () {
      class User extends Model {}
      class Post extends Model {}
      User.bootIfNotBooted()
      expect(Post.$booted).to.equal(undefined)
    })

    it('should throw an error when function is not passed to addGlobalScope method', function () {
      class User extends Model {}
      const fn = function () {
        User.addGlobalScope('hello')
      }
      expect(fn).to.throw(NE.InvalidArgumentException, /global scope callback must be a function/i)
    })

    it('should be able to add global scopes to the model instance', function () {
      class User extends Model {}
      User.addGlobalScope(function () {})
      expect(User.globalScope).to.be.an('array')
      expect(User.globalScope.length).to.equal(1)
      expect(User.globalScope[0]).to.be.a('function')
    })

    it('should be able to add global scopes to the model instance inside boot method', function () {
      class User extends Model {
        static boot () {
          super.boot()
          this.addGlobalScope(function () {})
        }
      }
      User.bootIfNotBooted()
      expect(User.globalScope).to.be.an('array')
      expect(User.globalScope.length).to.equal(2)
      expect(User.globalScope[0]).to.be.a('function')
    })

    it('should be able to add global scopes to the model instance inside boot method', function () {
      class User extends Model {
        static boot () {
          super.boot()
          this.addGlobalScope(function () {})
        }
      }
      User.bootIfNotBooted()
      expect(User.globalScope).to.be.an('array')
      expect(User.globalScope.length).to.equal(2)
      expect(User.globalScope[0]).to.be.a('function')
    })

    it('should make no effect on sibling models when adding global scopes', function () {
      class User extends Model {
        static boot () {
          super.boot()
          this.addGlobalScope(function () {})
        }
      }
      class Post extends Model {}
      User.bootIfNotBooted()
      Post.bootIfNotBooted()
      expect(User.globalScope).to.be.an('array')
      expect(User.globalScope.length).to.equal(2)
      expect(User.globalScope[0]).to.be.a('function')
      expect(Post.globalScope.length).to.equal(1)
    })
  })

  context('QueryBuilder', function () {
    it('should throw an error when not binding a function to onQuery event listener', function () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      const fn = function () {
        User.onQuery('foo')
      }
      expect(fn).to.throw(/onQuery only excepts a callback function/)
    })

    it('should return query builder instance when .query method is called', function () {
      class User extends Model {}
      const query = User.query()
      expect(query instanceof QueryBuilder).to.equal(true)
    })

    it('should return isolated instance of query builder when .query method is called', function () {
      class User extends Model {}
      const query = User.query().where('status', 'foo').toSQL()
      const query1 = User.query().where('status', 'bar').toSQL()
      expect(queryHelpers.formatQuery(query.sql)).to.equal(queryHelpers.formatQuery('select * from "users" where "status" = ?'))
      expect(query.bindings).deep.equal(['foo'])
      expect(queryHelpers.formatQuery(query1.sql)).to.equal(queryHelpers.formatQuery('select * from "users" where "status" = ?'))
      expect(query1.bindings).deep.equal(['bar'])
    })
  })

  context('Model Instance', function () {
    it('should throw an error when trying to initiate a model with an array of values', function () {
      class User extends Model {}
      const fn = function () {
        return new User([{name: 'foo'}, {name: 'bar'}])
      }
      expect(fn).to.throw(NE.InvalidArgumentException, /cannot initiate a model with multiple rows./)
    })

    it('should be able to initiate a model with an object of values', function () {
      class User extends Model {}
      const user = new User({name: 'foo', age: 22})
      expect(user.attributes.name).to.equal('foo')
      expect(user.attributes.age).to.equal(22)
    })

    it('should be able to add properties to a model instance', function () {
      class User extends Model {}
      const user = new User()
      user.attributes.name = 'foo'
      user.attributes.age = 22
      expect(user.attributes.name).to.equal('foo')
      expect(user.attributes.age).to.equal(22)
    })

    it('should freeze a model for editing once freeze method is called', function () {
      class User extends Model {}
      const user = new User()
      user.freeze()
      try {
        user.name = 'foo'
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.message).to.match(/Cannot edit a frozen model/)
      }
    })

    it('should call all getters when toJSON is called', function () {
      class User extends Model {
        getUsername (value) {
          return value.toUpperCase()
        }
      }
      const user = new User()
      user.username = 'foo'
      const json = user.toJSON()
      expect(user.attributes.username).to.equal('foo')
      expect(json.username).to.equal('FOO')
    })

    it('should not override the actual values when toJSON is called', function () {
      class User extends Model {
        getName (value) {
          return value.toUpperCase()
        }
      }
      const user = new User({name: 'foo', age: 22})
      const json = user.toJSON()
      expect(json.name).to.equal('FOO')
      expect(user.attributes.name).to.equal('foo')
    })

    it('should call all setters as soon as property is added to the model', function () {
      class User extends Model {
        setUsername (value) {
          return value.toUpperCase()
        }
      }
      const user = new User()
      user.username = 'foo'
      expect(user.attributes.username).to.equal('FOO')
    })

    it('should call all setters when values are injected inside the model instance', function () {
      class User extends Model {
        setUsername (value) {
          return value.toUpperCase()
        }
        setEmail (value) {
          return `${value}+sneaky@gmail.com`
        }
      }
      const user = new User({username: 'foo', email: 'bar'})
      expect(user.attributes.username).to.equal('FOO')
      expect(user.attributes.email).to.equal('bar+sneaky@gmail.com')
    })

    it('should remove all hidden properties from model instance values when toJSON is called', function () {
      class User extends Model {
        static get hidden () {
          return ['username']
        }
      }
      const user = new User()
      user.username = 'foo'
      user.age = 22
      const json = user.toJSON()
      expect(user.username).to.equal('foo')
      expect(json.username).to.equal(undefined)
      expect(json.age).to.equal(22)
    })

    it('should keep only visible properties on model instance values when toJSON is called', function () {
      class User extends Model {
        static get visible () {
          return ['age']
        }
      }
      const user = new User()
      user.username = 'foo'
      user.age = 22
      user.password = 'secret'
      const json = user.toJSON()
      expect(user.attributes.username).to.equal('foo')
      expect(user.attributes.password).to.equal('secret')
      expect(json.username).to.equal(undefined)
      expect(json.password).to.equal(undefined)
      expect(json.age).to.equal(22)
    })

    it('should give priority to visible properties over hidden properties', function () {
      class User extends Model {
        static get visible () {
          return ['age']
        }
        static get hidden () {
          return ['username']
        }
      }
      const user = new User()
      user.username = 'foo'
      user.age = 22
      user.password = 'secret'
      const json = user.toJSON()
      expect(user.attributes.username).to.equal('foo')
      expect(user.attributes.password).to.equal('secret')
      expect(json.username).to.equal(undefined)
      expect(json.password).to.equal(undefined)
      expect(json.age).to.equal(22)
    })

    it('should return true from isNew method when model instance has not be persisted to the database', function () {
      class User extends Model {}
      const user = new User()
      user.username = 'foo'
      expect(user.isNew()).to.equal(true)
    })

    it('should return false when model instance is not deleted or soft deleted', function () {
      class User extends Model {}
      const user = new User()
      user.username = 'foo'
      expect(user.isDeleted()).to.equal(false)
    })

    it('should persist values to the table when save is called for the first time', function * () {
      Ioc.bind('Adonis/Src/Helpers', function () {
        return {
          makeNameSpace: function (base, hook) {
            return `App/${base}/${hook}`
          }
        }
      })
      class User extends Model {}
      const user = new User()
      user.username = 'virk'
      user.firstname = 'Aman'
      user.lastname = 'Virk'
      yield user.save()
      expect(user.attributes.id).not.to.equal(undefined)
      expect(user.attributes.id).to.be.a('number')
      expect(user.isNew()).to.equal(false)
    })

    it('should return true when save operation is successful', function * () {
      class User extends Model {}
      const user = new User()
      user.username = 'virk'
      user.firstname = 'Aman'
      user.lastname = 'Virk'
      const result = yield user.save()
      expect(result).to.equal(true)
    })

    it('should throw an error when trying to save an empty model', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      const user = new User()
      try {
        yield user.save()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('RuntimeException')
        expect(e.message).to.match(/cannot save an empty model/i)
      }
    })

    it('should return dirty values using $dirty getter', function * () {
      class User extends Model {}
      const user = new User()
      user.username = 'doe'
      user.firstname = 'John'
      user.lastname = 'doe'
      yield user.save()
      user.lastname = 'Doe'
      expect(user.$dirty).deep.equal({lastname: 'Doe'})
    })

    it('should update the model instance instead of insert when instance is not new', function * () {
      class User extends Model {}
      const user = new User()
      user.username = 'doe'
      user.firstname = 'John'
      user.lastname = 'doe'
      yield user.save()
      const userId = user.$primaryKeyValue
      expect(user.isNew()).to.equal(false)
      user.username = 'amanVirk'
      yield user.save()
      const queryUser = yield User.query().where('id', userId).first()
      expect(queryUser.username).to.equal('amanVirk')
      expect(queryUser.id).to.equal(user.$primaryKeyValue)
      expect(user.attributes).deep.equal(user.original)
    })

    it('should not update model instance when nothing has been changed', function * () {
      class User extends Model {}
      const user = new User()
      user.username = 'doe'
      user.firstname = 'John'
      user.lastname = 'doe'
      yield user.save()
      expect(user.isNew()).to.equal(false)
      const affected = yield user.save()
      expect(affected).to.equal(0)
    })

    it('should not re-mutate the values on insert', function * () {
      class User extends Model {
        setFirstname (value) {
          return `${value}_first`
        }
      }
      const user = new User()
      user.username = 'doe'
      user.firstname = 'John'
      user.lastname = 'doe'
      expect(user.firstname).to.equal('John_first')
      yield user.save()
      expect(user.isNew()).to.equal(false)
      expect(user.firstname).to.equal('John_first')
    })

    it('should re-mutate the values on update', function * () {
      class User extends Model {
        setFirstname (value) {
          return `${value}_first`
        }
      }
      const user = yield User.query().fetch()
      const firstUser = user.first()
      const userId = firstUser.id
      firstUser.firstname = 'new_name'
      yield firstUser.save()
      const getSavedUser = yield User.query().where('id', userId).fetch()
      expect(getSavedUser.first().firstname).to.equal('new_name_first')
      expect(getSavedUser.attributes).deep.equal(getSavedUser.original)
    })

    it('should compute computed properties when toJSON is called', function () {
      class User extends Model {
        static get computed () {
          return ['fullName']
        }

        getFullName () {
          return this.firstname + this.lastname
        }
      }
      const user = new User()
      user.firstname = 'foo'
      user.lastname = 'bar'
      const jsoned = user.toJSON()
      expect(jsoned.fullName).to.equal('foobar')
      expect(user.fullName).to.equal(undefined)
    })

    it('should log warning when getter for a computed property is not defined', function () {
      class User extends Model {
        static get computed () {
          return ['fullName']
        }
      }
      const user = new User()
      user.firstname = 'foo'
      user.lastname = 'bar'
      const jsoned = user.toJSON()
      expect(jsoned.fullName).to.equal(undefined)
    })

    it('should set timestamp on newly created records when timestamps are on', function * () {
      class User extends Model {
      }
      const user = new User()
      user.firstname = 'unicorn'
      user.lastname = 'eva'
      yield user.save()
      expect(moment(user.attributes.created_at).isValid()).to.equal(true)
      expect(moment(user.attributes.updated_at).isValid()).to.equal(true)
    })

    it('should override manually defined created_at date', function * () {
      class User extends Model {
      }
      const user = new User()
      user.firstname = 'unicorn'
      user.lastname = 'eva'
      user.created_at = 'bad date'
      yield user.save()
      expect(moment(user.attributes.created_at).isValid()).to.equal(true)
    })

    it('should not set created at when createTimestamp is set to null', function * () {
      class User extends Model {
        static get createTimestamp () {
          return null
        }
      }
      const user = new User()
      user.firstname = 'unicorn'
      user.lastname = 'eva'
      yield user.save()
      expect(user.created_at).to.equal(undefined)
    })

    it('should update updated_at timestamp when model instance is updated', function * (done) {
      class User extends Model {
        getUpdateTimestamp (date) {
          return moment(date).format('x')
        }
      }
      const user = new User()
      user.firstname = 'unicorn'
      user.lastname = 'eva'
      yield user.save()
      const updatedTimestamp = user.updated_at
      user.firstname = 'dubba'
      setTimeout(function () {
        co(function * () {
          yield user.save()
        })
        .then(function () {
          expect(user.updated_at).to.be.above(updatedTimestamp)
          done()
        })
        .catch(done)
      }, 1000)
    })

    it('should not update updated_at timestamp when updateTimestamp is set to null', function * () {
      class User extends Model {
        static get updateTimestamp () {
          return null
        }
      }
      const user = new User()
      user.firstname = 'unicorn'
      user.lastname = 'eva'
      yield user.save()
      const updatedTimestamp = user.updated_at
      user.firstname = 'dubba'
      yield user.save()
      expect(user.updated_at).to.equal(updatedTimestamp).to.equal(undefined)
    })

    it('should soft delete rows when deleteTimestamp is configured', function * () {
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      const user = yield User.find(1)
      expect(user instanceof User).to.equal(true)
      expect(user.id).to.equal(1)
      yield user.delete()
      expect(user.isDeleted()).to.equal(true)
      const fetchUser = yield User.query().where('id', 1).withTrashed().first()
      expect(fetchUser.id).equal(1)
      expect(fetchUser.deleted_at).to.equal(user.deleted_at)
    })

    it('should be able to restore the model instance using restore method', function * () {
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      yield User.query().insert({username: 'foo', id: 908})
      User.bootIfNotBooted()
      const user = yield User.find(908)
      expect(user instanceof User).to.equal(true)
      expect(user.id).to.equal(908)
      yield user.delete()
      expect(user.isDeleted()).to.equal(true)
      yield user.restore()
      user.status = 'active'
      expect(user.status).to.equal('active')
      expect(user.deleted_at).to.equal(null)
      expect(user.isDeleted()).to.equal(false)
    })

    it('should throw an error when soft deletes are not enabled and trying to restore a model instance', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      yield User.query().insert({username: 'foo', id: 808})
      const user = yield User.find(808)
      expect(user instanceof User).to.equal(true)
      expect(user.id).to.equal(808)
      yield user.delete()
      expect(user.isDeleted()).to.equal(true)
      try {
        yield user.restore()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.message).to.match(/Restore can only be done when soft deletes are enabled/)
      }
    })

    it('should remove rows from database when soft deletes are not enabled', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      const user = yield User.find(2)
      expect(user instanceof User).to.equal(true)
      expect(user.id).to.equal(2)
      yield user.delete()
      expect(user.isDeleted()).to.equal(true)
      const fetchUser = yield User.query().where('id', 2)
      expect(user.deleted_at).to.equal(null)
      expect(fetchUser.length).to.equal(0)
    })

    it('should create and return model instance using static create method', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      const user = yield User.create({username: 'lupe', firstname: 'Lupe', lastname: 'Lamora'})
      expect(user instanceof User).to.equal(true)
      expect(user.id).to.be.a('number')
      expect(user.isNew()).to.equal(false)
    })

    it('should try to find first and create model instance using static findOrCreate method', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      const isJoana = yield User.query().where('username', 'joana').first()
      expect(isJoana).to.equal(null)
      const user = yield User.findOrCreate({username: 'joana'}, {username: 'joana', firstname: 'Joana', lastname: 'Jade'})
      expect(user instanceof User).to.equal(true)
      expect(user.id).to.be.a('number')
      expect(user.username).to.equal('joana')
    })

    it('should return the existing user and should not try to create it using findOrCreate method', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      yield User.create({username: 'frolla', firstname: 'Frolla', lastname: 'Editor'})
      const frolla = yield User.query().where('username', 'frolla').first()
      expect(frolla instanceof User).to.equal(true)
      const user = yield User.findOrCreate({username: 'frolla'}, {username: 'frolla', firstname: 'Frolla', lastname: 'Editor'})
      const frollaCounts = yield User.query().where('username', 'frolla').fetch()
      expect(frollaCounts.size()).to.equal(1)
      expect(user instanceof User).to.equal(true)
      expect(user.id).to.be.a('number')
      expect(user.username).to.equal('frolla')
    })

    it('should createMany records and return model instances as an array', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      const users = yield User.createMany([{username: 'lupe', firstname: 'Lupe', lastname: 'Lamora'}, {username: 'jim', firstname: 'Jim', lastname: 'Joe'}])
      expect(users).to.be.an('array')
      expect(users.length).to.equal(2)
      users.forEach(function (user) {
        expect(user instanceof User).to.equal(true)
        expect(user.id).to.be.a('number')
        expect(user.isNew()).to.equal(false)
      })
    })

    it('should throw an error when createMany does not receives an array', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      try {
        yield User.createMany({username: 'lupe', firstname: 'Lupe', lastname: 'Lamora'})
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('InvalidArgumentException')
        expect(e.message).to.match(/createMany requires an array of values/)
      }
    })

    it('should throw an error when trying to pass an array of values to create method', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      try {
        yield User.create([{username: 'lupe', firstname: 'Lupe', lastname: 'Lamora'}])
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('InvalidArgumentException')
        expect(e.message).to.match(/cannot initiate a model with multiple rows/i)
      }
    })

    it('should throw an error when passing nothing to create', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      try {
        yield User.create()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('RuntimeException')
        expect(e.message).to.match(/cannot save an empty model/i)
      }
    })
  })

  context('QueryBuilder', function () {
    it('should return an array of models instance when used fetch method', function * () {
      class User extends Model {}
      const users = yield User.query().fetch()
      expect(users.first() instanceof User).to.equal(true)
    })

    it('should call model instance toJSON method when toJSON is called on query builder', function * () {
      let invokedForTimes = 0
      class User extends Model {
        toJSON () {
          invokedForTimes++
          return super.toJSON()
        }
      }
      const users = yield User.query().fetch()
      const jsoned = users.toJSON()
      expect(invokedForTimes).to.equal(jsoned.length)
    })

    it('should return model instance when collection intermediate methods have been called', function * () {
      class User extends Model {
        toJSON () {
          return super.toJSON()
        }
      }
      const users = yield User.query().fetch()
      expect(users.last() instanceof User).to.equal(true)
    })

    it('should be able to filter on returned collection and instance toJSON should be called on filtered values', function * () {
      let invokedForTimes = 0
      class User extends Model {
        toJSON () {
          invokedForTimes++
          return super.toJSON()
        }
      }
      const users = yield User.query().fetch()
      const jsoned = users.filter(function (user) {
        return user.username === 'virk'
      }).toJSON()
      expect(invokedForTimes).to.equal(jsoned.length).to.equal(1)
    })

    it('should transform values when accessed directly instead of accessing within attributes', function * () {
      class User extends Model {
        getUsername (value) {
          return value.toUpperCase()
        }
      }
      const users = yield User.query().fetch()
      const user = users.first()
      expect(user.username).to.equal(user.attributes.username.toUpperCase())
      expect(user.username).not.to.equal(user.attributes.username)
    })

    it('should pick a given number of rows from database using pick method', function * () {
      class User extends Model {
      }
      let users = yield User.pick(2)
      users = users.toJSON()
      expect(users).to.be.an('array')
      expect(users[0].id).to.be.below(users[1].id)
      expect(users.length).to.equal(2)
    })

    it('should pick a given number of rows from database using query builder pick method', function * () {
      class User extends Model {
      }
      let users = yield User.query().where('username', 'virk').pick(2)
      users = users.toJSON()
      expect(users).to.be.an('array')
      expect(users.length).to.equal(1)
    })

    it('should pick only one row when limit argument is not passed to pick method', function * () {
      class User extends Model {
      }
      let users = yield User.pick()
      users = users.toJSON()
      expect(users).to.be.an('array')
      expect(users.length).to.equal(1)
    })

    it('should pick a given number of rows in reverse order from database using pickInverse method', function * () {
      class User extends Model {
      }
      let users = yield User.pickInverse(2)
      users = users.toJSON()
      expect(users).to.be.an('array')
      expect(users[0].id).to.be.above(users[1].id)
      expect(users.length).to.equal(2)
    })

    it('should pick a given number of rows in reverse order from database using query builder pickInverse method', function * () {
      class User extends Model {
      }
      let users = yield User.query().where('username', 'virk').pickInverse(2)
      users = users.toJSON()
      expect(users).to.be.an('array')
      expect(users.length).to.equal(1)
    })

    it('should pick only one row when limit argument is not passed to pickInverse method', function * () {
      class User extends Model {
      }
      let users = yield User.pickInverse()
      users = users.toJSON()
      expect(users).to.be.an('array')
      expect(users.length).to.equal(1)
    })

    it('should be able to find a given record using findBy method', function * () {
      class User extends Model {
      }
      yield User.query().insert({username: 'bea', firstname: 'Bea', lastname: 'Mine'})
      let user = yield User.findBy('username', 'bea')
      expect(user instanceof User)
      expect(user.username).to.equal('bea')
    })

    it('should be able to find a given record using primary key', function * () {
      class User extends Model {
      }
      const newUser = yield User.query().returning('id').insert({username: 'audie', firstname: 'Audie', lastname: 'Yose'})
      const userId = newUser[0]
      const user = yield User.find(userId)
      expect(user instanceof User)
      expect(user.username).to.equal('audie')
      expect(user.id).to.equal(userId)
    })

    it('should return null when unable to find a record using find method', function * () {
      class User extends Model {
      }
      const user = yield User.find(1220)
      expect(user).to.equal(null)
    })

    it('should return all rows inside a database when all method is called', function * () {
      class User extends Model {
      }
      const users = yield User.all()
      const total = yield User.query().count('* as total')
      expect(parseInt(total[0].total)).to.equal(users.size())
    })

    it('should return an array of ids when using ids method', function * () {
      class User extends Model {
      }
      const userIds = yield User.ids()
      expect(userIds).to.be.an('array')
      userIds.forEach(function (id) {
        expect(id).to.be.a('number')
      })
    })

    it('should be able to fetch ids of the query builder', function * () {
      class User extends Model {
      }
      const userIds = yield User.query().where('id', '>', 5).ids()
      expect(userIds).to.be.an('array')
      userIds.forEach(function (id) {
        expect(id).to.be.a('number')
        expect(id).to.be.above(5)
      })
    })

    it('should return a plain object with key/value pairs when using pair method', function * () {
      class User extends Model {
      }
      const usersPair = yield User.pair('id', 'username')
      const users = yield User.all()
      let manualPair = users.map(function (user) {
        return [user.id, user.username]
      }).fromPairs().value()
      expect(usersPair).to.be.an('object')
      expect(usersPair).deep.equal(manualPair)
    })

    it('should be able to use pairs of the query builder chain', function * () {
      class User extends Model {
      }
      const usersPair = yield User.query().pair('id', 'username')
      const users = yield User.all()
      let manualPair = users.map(function (user) {
        return [user.id, user.username]
      }).fromPairs().value()
      expect(usersPair).to.be.an('object')
      expect(usersPair).deep.equal(manualPair)
    })

    it('should pluck the first matching column field and return as a plain value', function * () {
      class User extends Model {
      }
      yield User.create({username: 'unique-user'})
      const username = yield User.query().where('username', 'unique-user').pluckFirst('username')
      expect(username).to.equal('unique-user')
    })

    it('should return null when pluckFirst has nothing found any rows', function * () {
      class User extends Model {
      }
      const username = yield User.query().where('username', 'non-existing-user').pluckFirst('username')
      expect(username).to.equal(null)
    })

    it('should pluck the first matching column id and return as a plain value', function * () {
      class User extends Model {
      }
      const user = yield User.create({username: 'unique-user-for-id'})
      const userId = yield User.query().where('username', 'unique-user-for-id').pluckId()
      expect(userId).to.equal(user.id)
    })

    it('should throw ModelNotFoundException when unable to find a record using findOrFail method', function * () {
      class User extends Model {
      }
      try {
        yield User.findOrFail(1220)
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelNotFoundException')
        expect(e.message).to.match(/unable to fetch results for id 1220/i)
      }
    })

    it('should throw ModelNotFoundException when unable to find a record using firstOfFail method', function * () {
      class User extends Model {
      }
      try {
        yield User.query().where('id', 1220).firstOrFail()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('ModelNotFoundException')
        expect(e.message).to.match(/unable to find given row/i)
      }
    })

    it('should return model instance using findOrFail method', function * () {
      class User extends Model {
      }
      const user = yield User.findOrFail(3)
      expect(user instanceof User).to.equal(true)
      expect(user.id).to.equal(3)
    })

    it('should not fetch soft deleted rows when soft deletes are on', function * () {
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      const user = new User()
      user.username = 'ivana'
      user.firstname = 'Ivana'
      user.lastname = 'Humpalot'
      yield user.save()
      yield user.delete()
      expect(user.deleted_at).not.to.equal(undefined)
      expect(user.isDeleted()).to.equal(true)
      const ivana = yield User.query().where('username', 'ivana').fetch()
      expect(ivana.size()).to.equal(0)
    })

    it('should return soft deleted rows when withTrashed method is called', function * () {
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      const user = new User()
      user.username = 'lois'
      user.firstname = 'Lois'
      user.lastname = 'Lane'
      yield user.save()
      yield user.delete()
      expect(user.deleted_at).not.to.equal(undefined)
      expect(user.isDeleted()).to.equal(true)
      const lois = yield User.query().where('username', 'lois').withTrashed().first()
      expect(lois instanceof User).to.equal(true)
      expect(lois.id).to.equal(user.id)
    })

    it('should not pollute global scope when withTrashed is called', function * () {
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      const user = new User()
      user.username = 'patty'
      user.firstname = 'Patty'
      user.lastname = 'O\'Furniture'
      yield user.save()
      yield user.delete()
      expect(user.deleted_at).not.to.equal(undefined)
      expect(user.isDeleted()).to.equal(true)
      const trashedPatty = yield User.query().where('username', 'patty').withTrashed().first()
      const patty = yield User.query().where('username', 'patty').first()
      expect(patty).to.equal(null)
      expect(trashedPatty instanceof User).to.equal(true)
      expect(trashedPatty.id).to.equal(user.id)
    })

    it('should return all soft deleted rows when onlyTrashed method is used', function * () {
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      const trashedUsers = yield User.query().onlyTrashed().fetch()
      expect(trashedUsers.size()).to.be.above(0)
      trashedUsers.each(function (user) {
        expect(user.deleted_at).to.be.a('string')
      })
    })

    it('should call all global scopes when fetch method is called', function * () {
      let scopeCalled = false
      class User extends Model {
        static boot () {
          super.boot()
          this.addGlobalScope(() => {
            scopeCalled = true
          })
        }
      }
      User.bootIfNotBooted()
      yield User.pick()
      expect(scopeCalled).to.equal(true)
    })

    it('should soft delete rows when doing bulk delete', function * () {
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      yield User.query().insert([{username: 'anne', firstname: 'Anne', lastname: 'Teak'}, {username: 'anne', firstname: 'Anne', lastname: 'Teak'}])
      const deleted = yield User.query().where({username: 'anne'}).delete()
      expect(deleted).to.equal(2)
      const deleteUsers = yield User.query().where('username', 'anne')
      expect(deleteUsers).to.be.an('array')
      expect(deleteUsers.length).to.equal(2)
      expect(new Date(deleteUsers[0].deleted_at)).to.be.a('date')
      expect(new Date(deleteUsers[1].deleted_at)).to.be.a('date')
    })

    it('should be able to bulk restore deleted rows', function * () {
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      yield User.query().insert([{username: 'jamie', firstname: 'Jamie', lastname: 'Teak'}, {username: 'jamie', firstname: 'Jamie', lastname: 'Teak'}])
      const deleted = yield User.query().where({username: 'jamie'}).delete()
      expect(deleted).to.equal(2)
      yield User.query().where('username', 'jamie').restore()
      const restoredUsers = yield User.query().where('username', 'jamie')
      expect(restoredUsers).to.be.an('array')
      expect(restoredUsers.length).to.equal(2)
      expect(restoredUsers[0].deleted_at).to.equal(null)
      expect(restoredUsers[1].deleted_at).to.equal(null)
    })

    it('should remove rows from database when soft deletes are not enabled', function * () {
      class User extends Model {
      }
      User.bootIfNotBooted()
      yield User.query().insert([{username: 'boe', firstname: 'Anne', lastname: 'Teak'}, {username: 'boe', firstname: 'Anne', lastname: 'Teak'}])
      const deleted = yield User.query().where({username: 'boe'}).delete()
      expect(deleted).to.equal(2)
      const deleteUsers = yield User.query().where('username', 'boe')
      expect(deleteUsers).to.be.an('array')
      expect(deleteUsers.length).to.equal(0)
    })

    it('should be able to paginate results using model query builder', function * () {
      class User extends Model {
      }
      const users = yield User.query().paginate(1, 10)
      const paginatedUsers = users.toJSON()
      expect(paginatedUsers).to.have.property('total')
      expect(paginatedUsers).to.have.property('lastPage')
      expect(paginatedUsers).to.have.property('perPage')
      expect(paginatedUsers).to.have.property('data')
      expect(paginatedUsers.perPage).to.equal(paginatedUsers.data.length)
    })

    it('should be able to paginate results using model static method', function * () {
      class User extends Model {
      }
      const users = yield User.paginate(1, 10)
      const paginatedUsers = users.toJSON()
      expect(paginatedUsers).to.have.property('total')
      expect(paginatedUsers).to.have.property('lastPage')
      expect(paginatedUsers).to.have.property('perPage')
      expect(paginatedUsers).to.have.property('data')
      expect(paginatedUsers.perPage).to.equal(paginatedUsers.data.length)
    })
  })
  context('Model Hooks', function () {
    it('should throw an error when trying to add a hook with wrong type', function () {
      class User extends Model {}
      const fn = function () {
        User.addHook('anytime', function () {})
      }
      expect(fn).to.throw(NE.InvalidArgumentException, /anytime is not a valid hook type/)
    })

    it('should throw an error when hook handler is defined', function () {
      class User extends Model {}
      const fn = function () {
        User.addHook('beforeCreate')
      }
      expect(fn).to.throw(NE.InvalidArgumentException, /hook handler must point to a valid generator method/)
    })

    it('should add a hook for a given type', function () {
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * () {})
      expect(User.$modelHooks['beforeCreate']).to.be.an('array')
      expect(User.$modelHooks['beforeCreate'].length).to.equal(1)
      expect(User.$modelHooks['beforeCreate'][0].name).to.equal(null)
      expect(typeof (User.$modelHooks['beforeCreate'][0].handler)).to.equal('function')
    })

    it('should add a named hook for a given type', function () {
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', 'validateUser', function * () {})
      expect(User.$modelHooks['beforeCreate']).to.be.an('array')
      expect(User.$modelHooks['beforeCreate'].length).to.equal(1)
      expect(User.$modelHooks['beforeCreate'][0].name).to.equal('validateUser')
    })

    it('should be able to remove a named hook', function () {
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * () {})
      User.addHook('beforeCreate', 'validateUser', function * () {})
      expect(User.$modelHooks['beforeCreate']).to.be.an('array')
      expect(User.$modelHooks['beforeCreate'].length).to.equal(2)
      User.removeHook('validateUser')
      expect(User.$modelHooks['beforeCreate'].length).to.equal(1)
      expect(User.$modelHooks['beforeCreate'][0].name).to.equal(null)
    })

    it('should be able to define multiple hooks in a go', function () {
      class User extends Model {}
      User.bootIfNotBooted()
      User.defineHooks('beforeCreate', 'UsersHook.validate', 'UsersHook.log')
      expect(User.$modelHooks['beforeCreate']).to.be.an('array')
      expect(User.$modelHooks['beforeCreate'].length).to.equal(2)
      expect(User.$modelHooks['beforeCreate'][0].handler).to.equal('UsersHook.validate')
      expect(User.$modelHooks['beforeCreate'][1].handler).to.equal('UsersHook.log')
    })

    it('should override existing hooks when calling defineHooks', function () {
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * () {})
      User.defineHooks('beforeCreate', 'UsersHook.validate', 'UsersHook.log')
      expect(User.$modelHooks['beforeCreate']).to.be.an('array')
      expect(User.$modelHooks['beforeCreate'].length).to.equal(2)
      expect(User.$modelHooks['beforeCreate'][0].handler).to.equal('UsersHook.validate')
      expect(User.$modelHooks['beforeCreate'][1].handler).to.equal('UsersHook.log')
    })

    it('should execute beforeCreate hook when a model is saved to the database', function * () {
      let hookCalled = false
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * (next) {
        hookCalled = true
        yield next
      })
      const user = new User()
      user.username = 'liz'
      user.firstname = 'Liz'
      user.lastname = 'Erd'
      yield user.save()
      expect(hookCalled).to.equal(true)
    })

    it('should execute beforeCreate hook registered via namespace', function * () {
      Ioc.bind('Adonis/Src/Helpers', function () {
        return {
          makeNameSpace: function (base, hook) {
            return `App/${base}/${hook}`
          }
        }
      })
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', 'Users.validate')
      const user = new User()
      user.username = 'liz'
      user.firstname = 'Liz'
      user.lastname = 'Erd'
      yield user.save()
      expect(user.username).to.equal('viahook')
    })

    it('should call hooks sequentially', function * () {
      let hooksCount = 0
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * (next) {
        if (hooksCount !== 0) {
          throw new Error('expected hooks count should be 0')
        }
        hooksCount++
        yield next
      })

      User.addHook('beforeCreate', function * (next) {
        if (hooksCount !== 1) {
          throw new Error('expected hooks count should be 1')
        }
        hooksCount++
        yield next
      })

      const user = new User()
      user.username = 'liz'
      user.firstname = 'Liz'
      user.lastname = 'Erd'
      yield user.save()
      expect(hooksCount).to.equal(2)
    })

    it('should have access to model instance inside hook methods', function * () {
      let attributes = {}
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * (next) {
        attributes = this.attributes
        yield next
      })
      const user = new User()
      user.username = 'liz'
      user.firstname = 'Liz'
      user.lastname = 'Erd'
      yield user.save()
      expect(attributes.username).to.equal('liz')
      expect(attributes.firstname).to.equal('Liz')
      expect(attributes.lastname).to.equal('Erd')
    })

    it('should have access to model id inside afterCreate hook', function * () {
      let userId = 0
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('afterCreate', function * (next) {
        userId = this.id
        yield next
      })
      const user = new User()
      user.username = 'liz'
      user.firstname = 'Liz'
      user.lastname = 'Erd'
      yield user.save()
      expect(userId).to.equal(user.id)
    })

    it('should excute afterCreate after beforeCreate hooks', function * () {
      let hooksCount = 0
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * (next) {
        if (hooksCount !== 0) {
          throw new Error('expected hooks count should be 0')
        }
        hooksCount++
        yield next
      })
      User.addHook('beforeCreate', function * (next) {
        if (hooksCount !== 1) {
          throw new Error('expected hooks count should be 1')
        }
        hooksCount++
        yield next
      })
      User.addHook('afterCreate', function * (next) {
        if (hooksCount !== 2) {
          throw new Error('expected hooks count should be 2')
        }
        hooksCount++
        yield next
      })
      const user = new User()
      user.username = 'liz'
      user.firstname = 'Liz'
      user.lastname = 'Erd'
      yield user.save()
      expect(hooksCount).to.equal(3)
    })

    it('should not insert values if a before hook does not return next', function * () {
      let hookCalled = false
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * () {
        hookCalled = true
      })
      const user = new User()
      user.username = 'barbara'
      yield user.save()
      expect(hookCalled).to.equal(true)
      expect(user.id).to.equal(undefined)
    })

    it('should return errors thrown by hooks and abort all upcoming hooks', function * () {
      let nextHookCalled = false
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * () {
        throw new Error('i am stopping you')
      })
      User.addHook('beforeCreate', function * (next) {
        nextHookCalled = true
        yield next
      })
      const user = new User()
      user.username = 'barbara'
      try {
        yield user.save()
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.message).to.equal('i am stopping you')
        expect(nextHookCalled).to.equal(false)
        expect(user.id).to.equal(undefined)
      }
    })

    it('should not execute beforeCreate hooks when doing bulk insert', function * () {
      let hookCalled = false
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * (next) {
        hookCalled = true
        yield next
      })
      yield User.query().insert({username: 'faker'})
      expect(hookCalled).to.equal(false)
    })

    it('should not execute afterCreate hooks when doing bulk insert', function * () {
      let hookCalled = false
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('afterCreate', function * (next) {
        hookCalled = true
        yield next
      })
      yield User.query().insert({username: 'faker'})
      expect(hookCalled).to.equal(false)
    })

    it('should execute beforeUpdate hooks when updating model instance', function * () {
      let hookCalled = false
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeUpdate', function * (next) {
        hookCalled = true
        yield next
      })
      const user = yield User.find(3)
      expect(user instanceof User).to.equal(true)
      user.firstname = 'new name'
      yield user.save()
      expect(hookCalled).to.equal(true)
    })

    it('should return error message thrown by afterCreate but should not abort create request', function * () {
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('afterCreate', function * () {
        throw new Error('should not have created it')
      })
      const user = new User()
      user.username = 'shaddy'
      user.firstname = 'Shady'
      user.lastname = 'Tree'
      try {
        yield user.save()
        expect(true).to.equal(false)
      } catch (e) {
        expect(user.id).to.be.a('number')
        expect(user.isNew()).to.equal(false)
        expect(e.message).to.equal('should not have created it')
      }
    })

    it('should continue save if beforeCreate has a setTimeout after yield next', function * (done) {
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeCreate', function * (next) {
        yield next
        setTimeout(() => {
          expect(this.id).to.be.a('number')
          done()
        })
      })
      const user = new User()
      user.username = 'shaddy'
      user.firstname = 'Shady'
      user.lastname = 'Tree'
      yield user.save()
    })

    it('should call before delete hooks when deleting a model', function * () {
      let hookCalled = false
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeDelete', function * (next) {
        hookCalled = true
        yield next
      })
      const user = new User()
      user.username = 'melody'
      user.firstname = 'Melody'
      user.lastname = 'Sunshine'
      yield user.save()
      yield user.delete()
      expect(hookCalled).to.equal(true)
    })

    it('should call before delete hooks when soft deleting a model', function * () {
      let hookCalled = false
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      User.addHook('beforeDelete', function * (next) {
        hookCalled = true
        yield next
      })
      const user = new User()
      user.username = 'melody'
      user.firstname = 'Melody'
      user.lastname = 'Sunshine'
      yield user.save()
      yield user.delete()
      expect(hookCalled).to.equal(true)
      expect(user.deleted_at instanceof moment)
    })

    it('should not execute beforeUpdate when doing soft deleted', function * () {
      let hookCalled = false
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      User.addHook('beforeDelete', function * (next) {
        yield next
      })
      User.addHook('beforeUpdate', function * (next) {
        hookCalled = true
        yield next
      })
      const user = new User()
      user.username = 'clark'
      user.firstname = 'Clark'
      user.lastname = 'Kent'
      yield user.save()
      yield user.delete()
      expect(hookCalled).to.equal(false)
    })

    it('should call before restore hooks when restoring a model', function * () {
      let hookCalled = false
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      User.addHook('beforeRestore', function * (next) {
        hookCalled = true
        yield next
      })
      const user = new User()
      user.username = 'melody'
      user.firstname = 'Melody'
      user.lastname = 'Sunshine'
      yield user.save()
      yield user.delete()
      expect(hookCalled).to.equal(false)
      expect(user.isDeleted()).to.equal(true)
      yield user.restore()
      expect(hookCalled).to.equal(true)
      expect(user.isDeleted()).to.equal(false)
    })

    it('should call before & after restore hooks when restoring a model', function * () {
      let userId = null
      let hookCalled = false
      class User extends Model {
        static get deleteTimestamp () {
          return 'deleted_at'
        }
      }
      User.bootIfNotBooted()
      User.addHook('beforeRestore', function * (next) {
        hookCalled = true
        yield next
      })
      User.addHook('afterRestore', function * (next) {
        userId = this.id
        yield next
      })
      const user = new User()
      user.username = 'melody'
      user.firstname = 'Melody'
      user.lastname = 'Sunshine'
      yield user.save()
      yield user.delete()
      expect(hookCalled).to.equal(false)
      expect(user.isDeleted()).to.equal(true)
      yield user.restore()
      expect(hookCalled).to.equal(true)
      expect(user.isDeleted()).to.equal(false)
      expect(user.id).to.equal(userId)
    })
  })

  context('Query Scopes', function () {
    it('should be able to define query scopes on model', function () {
      class User extends Model {
        static scopeActive (builder) {
          builder.where('status', 'active')
        }
      }
      User.bootIfNotBooted()
      const sql = User.query().active().toSQL()
      expect(queryHelpers.formatQuery(sql.sql)).to.equal(queryHelpers.formatQuery('select * from "users" where "status" = ?'))
      expect(sql.bindings).deep.equal(['active'])
    })

    it('should be able to pass values to scope methods', function () {
      class User extends Model {
        static scopeActive (builder, status) {
          builder.where('status', status)
        }
      }
      User.bootIfNotBooted()
      const sql = User.query().active('inactive').toSQL()
      expect(queryHelpers.formatQuery(sql.sql)).to.equal(queryHelpers.formatQuery('select * from "users" where "status" = ?'))
      expect(sql.bindings).deep.equal(['inactive'])
    })

    it('should have reference to model inside scope methods', function () {
      let Ref = null
      class User extends Model {
        static scopeActive () {
          Ref = this
        }
      }
      User.bootIfNotBooted()
      User.query().active()
      expect(new Ref() instanceof User).to.equal(true)
    })

    it('should consider attributes chaned inside before update as dirty values when updating', function * () {
      class User extends Model {}
      User.bootIfNotBooted()
      User.addHook('beforeUpdate', function * (next) {
        this.lastname = 'foo'
        yield next
      })
      const user = yield User.find(3)
      expect(user instanceof User).to.equal(true)
      yield user.save()
      const reFetchUser = yield User.find(3)
      expect(reFetchUser.lastname).to.equal('foo')
    })
  })
})
