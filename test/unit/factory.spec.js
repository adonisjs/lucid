'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it, after, before */
const chai = require('chai')
const expect = chai.expect
const Model = require('../../src/Lucid/Model')
const Database = require('../../src/Database')
const Factory = require('../../src/Factory')
const filesFixtures = require('./fixtures/files')
const modelFixtures = require('./fixtures/model')
const ModelFactory = require('../../src/Factory/ModelFactory')
const config = require('./helpers/config')
const _ = require('lodash')
const Ioc = require('adonis-fold').Ioc
require('co-mocha')

describe('Factory', function () {
  before(function * () {
    Database._setConfigProvider(config)
    yield filesFixtures.createDir()
    yield modelFixtures.up(Database)
    Ioc.bind('Adonis/Src/Database', function () {
      return Database
    })
    Ioc.bind('Adonis/Src/Helpers', function () {
      return {
        makeNameSpace: function (hook) {
          return `App/${hook}`
        }
      }
    })
    Factory.clear()
  })

  after(function * () {
    yield modelFixtures.down(Database)
    Database.close()
  })

  it('should throw an error when blueprint callback is not a function', function () {
    const fn = function () {
      Factory.blueprint('App/Model/User', 'foo')
    }
    expect(fn).to.throw('InvalidArgumentException: E_INVALID_PARAMETER: Factory blueprint expects callback to be a function')
  })

  it('should throw an error when unable to resolve model factory', function () {
    const fn = function () {
      Factory.model('App/Model/User')
    }
    expect(fn).to.throw('RuntimeException: E_MISSING_MODEL_FACTORY: Cannot find model factory for App/Model/User')
  })

  it('should throw an error when unable to resolve database factory', function () {
    const fn = function () {
      Factory.get('users')
    }
    expect(fn).to.throw('RuntimeException: E_MISSING_DATABASE_FACTORY: Cannot find database factory for users')
  })

  it('should be able to define a factory blueprint', function () {
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        email: fake.email()
      }
    })
    const blueprints = Factory.blueprints()
    expect(blueprints).to.be.an('object')
    expect(blueprints['App/Model/User']).to.be.a('function')
  })

  it('should return instance of model factory when using model method', function () {
    Ioc.bind('App/Model/User', function () {
      return {}
    })
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        email: fake.email()
      }
    })
    const userModelFactory = Factory.model('App/Model/User')
    expect(userModelFactory instanceof ModelFactory).to.equal(true)
  })

  it('should return the model instance from ModelFactory make method', function () {
    class User {
      constructor (values) {
        this.attributes = values
      }
    }
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        email: fake.email()
      }
    })
    const user = Factory.model('App/Model/User').make()
    expect(user instanceof User).to.equal(true)
    expect(user.attributes.username).to.be.a('string')
    expect(user.attributes.email).to.be.a('string')
  })

  it('should return an array of model instances from ModelFactory make method is called with a count', function () {
    class User {
      constructor (values) {
        this.attributes = values
      }
    }
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        email: fake.email()
      }
    })
    const users = Factory.model('App/Model/User').make(4)
    expect(users).is.an('array')
    expect(users.length).to.equal(4)
    users.forEach(function (user) {
      expect(user instanceof User).to.equal(true)
      expect(user.attributes.username).to.be.a('string')
      expect(user.attributes.email).to.be.a('string')
    })
  })

  it('should return the model instance from ModelFactory make method is asked to return 1 instance', function () {
    class User {
      constructor (values) {
        this.attributes = values
      }
    }
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        email: fake.email()
      }
    })
    const user = Factory.model('App/Model/User').make(1)
    expect(user instanceof User).to.equal(true)
    expect(user.attributes.username).to.be.a('string')
    expect(user.attributes.email).to.be.a('string')
  })

  it('should call user model create method to create given rows inside the database', function * () {
    class User {
      constructor (values) {
        this.attributes = values
      }
      static * create (values) {
        const instance = new this(values)
        return instance
      }
    }
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        email: fake.email()
      }
    })
    const userModelFactory = yield Factory.model('App/Model/User').create(10)
    expect(userModelFactory.instances.length).to.equal(10)
    userModelFactory.instances.forEach(function (user) {
      expect(user instanceof User).to.equal(true)
    })
  })

  it('should be able to loop through each created instance and call generator methods inside it', function * () {
    class User {
      constructor (values) {
        this.attributes = values
      }
      static * create (values) {
        const instance = new this(values)
        return instance
      }
    }
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        email: fake.email()
      }
    })
    const userModelFactory = yield Factory.model('App/Model/User').create(10)
    userModelFactory.each(function * (user) {
      user.attributes.touched = true
    })
    userModelFactory.instances.forEach(function (user) {
      expect(user.attributes.touched).to.equal(true)
    })
  })

  it('should create rows inside associated table for a given model', function * () {
    class User extends Model {}
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        firstname: fake.first()
      }
    })
    yield Factory.model('App/Model/User').create(10)
    const users = yield User.all()
    expect(users.size()).to.equal(10)
    yield modelFixtures.truncate(Database)
  })

  it('should truncate rows inside associated table for a given model', function * () {
    class User extends Model {}
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake) {
      return {
        username: fake.username(),
        firstname: fake.first()
      }
    })
    const userModelFactory = yield Factory.model('App/Model/User').create(10)
    const users = yield User.all()
    expect(users.size()).to.equal(10)
    yield userModelFactory.reset()
    const afterReset = yield User.all()
    expect(afterReset.size()).to.equal(0)
  })

  it('should be able to create records using the database factory', function * () {
    Factory.blueprint('users', function (fake) {
      return {
        username: fake.username(),
        firstname: fake.first()
      }
    })
    const ids = yield Factory.get('users').create(10)
    expect(ids).to.be.an('array')
    expect(ids.length).to.equal(10)
    yield modelFixtures.truncate(Database)
  })

  it('should be able to define different table name when using database factory', function * () {
    Factory.blueprint('forUsers', function (fake) {
      return {
        username: fake.username(),
        firstname: fake.first()
      }
    })
    const ids = yield Factory.get('forUsers').table('users').create(10)
    expect(ids).to.be.an('array')
    expect(ids.length).to.equal(10)
    yield modelFixtures.truncate(Database)
  })

  it('should be able to define different returning field when using database factory', function * () {
    Factory.blueprint('forUsers', function (fake) {
      return {
        username: fake.username(),
        firstname: fake.first()
      }
    })
    const dbFactory = Factory.get('forUsers').table('users').returning('username')
    yield dbFactory.create(10)
    expect(dbFactory.returningField).to.equal('username')
    yield modelFixtures.truncate(Database)
  })

  it('should be able to truncat the database table using the reset method', function * () {
    Factory.blueprint('users', function (fake) {
      return {
        username: fake.username(),
        firstname: fake.first()
      }
    })
    yield Factory.get('users').create(10)
    yield Factory.get('users').reset()
    const ids = yield Database.table('users').pluck('ids')
    expect(ids).to.be.an('array')
    expect(ids.length).to.equal(0)
  })

  it('should get the iteration count when making multiple instances', function * () {
    class User extends Model {}
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake, i) {
      return {
        username: fake.username(),
        firstname: fake.first(),
        custom_id: i
      }
    })
    const users = Factory.model('App/Model/User').make(5)
    expect(_.map(users, 'custom_id')).deep.equal([1, 2, 3, 4, 5])
  })

  it('should get the iteration count when creating multiple instances', function * () {
    class User extends Model {}
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake, i) {
      return {
        username: i,
        firstname: fake.first()
      }
    })
    yield Factory.model('App/Model/User').create(5)
    const users = yield User.all()
    expect(users.size()).to.equal(5)
    expect(users.map('username').value()).deep.equal(['1', '2', '3', '4', '5'])
    yield modelFixtures.truncate(Database)
  })

  it('should able to pass custom data to the factory blueprint via make method', function * () {
    class User extends Model {}
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake, i, user) {
      return {
        username: user.username,
        firstname: user.firstname
      }
    })
    const user = Factory.model('App/Model/User').make(1, {username: 'foo', firstname: 'bar'})
    expect(user.username).to.equal('foo')
    expect(user.firstname).to.equal('bar')
  })

  it('should able to pass custom data to the factory blueprint via create method', function * () {
    class User extends Model {}
    Ioc.bind('App/Model/User', function () {
      return User
    })
    Factory.blueprint('App/Model/User', function (fake, i, user) {
      return {
        username: user.username,
        firstname: user.firstname
      }
    })
    yield Factory.model('App/Model/User').create(1, {username: 'foo', firstname: 'bar'})
    const users = yield User.all()
    expect(users.size()).to.equal(1)
    expect(users.first().username).to.equal('foo')
    expect(users.first().firstname).to.equal('bar')
    yield modelFixtures.truncate(Database)
  })

  it('should be able to pass custom values when using database factory', function * () {
    Factory.blueprint('forUsers', function (fake, i, user) {
      return {
        username: user.username,
        firstname: user.firstname
      }
    })
    const dbFactory = Factory.get('forUsers').table('users')
    yield dbFactory.create(1, {username: 'foo', firstname: 'bar'})
    const users = yield Database.table('users')
    expect(users[0].username).to.equal('foo')
    expect(users[0].firstname).to.equal('bar')
    yield modelFixtures.truncate(Database)
  })
})
