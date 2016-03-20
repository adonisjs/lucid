'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/*
|--------------------------------------------------------------------------
| RELATIONSHIPS TESTING
|--------------------------------------------------------------------------
|
| Here we will setup relationships and their equalivent tests.
|
*/

/* global describe, it, after, before, context */
const chai = require('chai')
const fold = require('adonis-fold')
const Ioc = fold.Ioc
const setup = require('./setup')
const expect = chai.expect
require('co-mocha')

describe('Relationships', function () {
  before(function * () {
    yield setup.loadProviders()
    yield setup.start()
  })

  after(function * () {
    yield setup.end()
  })

  context('hasOne', function () {
    before(function * () {
      /**
       * definations
       */
      const Lucid = Ioc.use('Adonis/Src/Lucid')
      class User extends Lucid {
        profile () {
          return this.hasOne('App/Model/Profile')
        }
      }
      class Profile extends Lucid {}
      Ioc.bind('App/Model/User', function () {
        return User
      })
      Ioc.bind('App/Model/Profile', function () {
        return Profile
      })

      /**
       * schema
       */
      const Schema = Ioc.use('Adonis/Src/Schema')
      class UserSchema extends Schema {
        up () {
          this.create('users', function (table) {
            table.increments()
            table.string('username')
            table.string('email')
            table.string('password')
            table.timestamps()
          })
        }

        down () {
          this.drop('users')
        }
      }
      class ProfileSchema extends Schema {
        up () {
          this.create('profiles', function (table) {
            table.increments()
            table.integer('user_id')
            table.string('avatar')
            table.string('name')
            table.timestamps()
          })
        }
        down () {
          this.drop('profiles')
        }
      }

      /**
       * seeds & factories
       */
      const Factory = Ioc.use('Adonis/Src/Factory')
      Factory.blueprint('App/Model/User', function (faker) {
        return {
          username: faker.internet.userName(),
          email: faker.internet.email(),
          password: faker.internet.password()
        }
      })
      Factory.blueprint('App/Model/Profile', function (faker) {
        return {
          name: faker.internet.userName(),
          avatar: faker.image.avatar()
        }
      })

      class UserSeed {
        * run () {
          const users = yield Factory.model('App/Model/User').create(5)
          users.each(function * (user) {
            yield user.profile().save(Factory.model('App/Model/Profile').make())
          })
        }
      }
      /**
       * EXECUTION
      */
      this.migrations = {}
      this.migrations[new Date().getTime() + '_users'] = UserSchema
      this.migrations[new Date().getTime() + '_profiles'] = ProfileSchema
      yield setup.migrate(this.migrations, 'down')
      yield setup.migrate(this.migrations, 'up')
      yield setup.seed([UserSeed])
      this.User = User
      this.Profile = Profile
    })

    after(function * () {
      yield setup.migrate(this.migrations, 'down')
    })

    it('should fetch related profile for a given user', function * () {
      const user = yield this.User.find(1)
      expect(user instanceof this.User).to.equal(true)
      const profile = yield user.profile().fetch()
      expect(profile instanceof this.Profile).to.equal(true)
      expect(profile.user_id).to.equal(user.id)
    })

    it('should save related profile for a given user', function * () {
      const Factory = Ioc.use('Adonis/Src/Factory')
      const user = Factory.model('App/Model/User').make()
      yield user.save()
      expect(user.id).not.to.equal(undefined)
      expect(user.isNew()).to.equal(false)
      const profile = Factory.model('App/Model/Profile').make()
      yield user.profile().save(profile)
      expect(profile.user_id).to.equal(user.id)
    })
  })
})
