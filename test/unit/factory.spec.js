'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it, after, before*/
const chai = require('chai')
const expect = chai.expect
const Model = require('../../src/Lucid/Model')
const Database = require('../../src/Database')
const Factory = require('../../src/Factory')
const filesFixtures = require('./fixtures/files')
const modelFixtures = require('./fixtures/model')
const ModelFactory = require('../../src/Factory/ModelFactory')
const config = require('./helpers/config')
const Ioc = require('adonis-fold').Ioc
require('co-mocha')

describe('Factory', function () {
  before(function * () {
    Database._setConfigProvider(config)
    yield filesFixtures.createDir()
    yield modelFixtures.up(Database)
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
    expect(fn).to.throw(/callback should be a function while define a factory blueprint/)
  })

  it('should be able to define a factory blueprint', function () {
    Factory.blueprint('App/Model/User', function (faker) {
      return {
        username: faker.internet.userName(),
        email: faker.internet.email()
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
    Factory.blueprint('App/Model/User', function (faker) {
      return {
        username: faker.internet.userName(),
        email: faker.internet.email()
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
    Factory.blueprint('App/Model/User', function (faker) {
      return {
        username: faker.internet.userName(),
        email: faker.internet.email()
      }
    })
    const user = Factory.model('App/Model/User').make()
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
    Factory.blueprint('App/Model/User', function (faker) {
      return {
        username: faker.internet.userName(),
        email: faker.internet.email()
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
    Factory.blueprint('App/Model/User', function (faker) {
      return {
        username: faker.internet.userName(),
        email: faker.internet.email()
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
    Factory.blueprint('App/Model/User', function (faker) {
      return {
        username: faker.internet.userName(),
        firstname: faker.name.firstName()
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
    Factory.blueprint('App/Model/User', function (faker) {
      return {
        username: faker.internet.userName(),
        firstname: faker.name.firstName()
      }
    })
    const userModelFactory = yield Factory.model('App/Model/User').create(10)
    const users = yield User.all()
    expect(users.size()).to.equal(10)
    yield userModelFactory.reset()
    const afterReset = yield User.all()
    expect(afterReset.size()).to.equal(0)
  })
})
