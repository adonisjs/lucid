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
const path = require('path')
const fs = require('fs-extra')
const { ioc } = require('@adonisjs/fold')
const { Config, setupResolver } = require('@adonisjs/sink')
const Model = require('../../src/Lucid/Model')
const Factory = require('../../src/Factory')
const ModelFactory = require('../../src/Factory/ModelFactory')
const helpers = require('./helpers')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Factory', (group) => {
  group.beforeEach(() => {
    Factory.clear()
    ioc.restore()
  })

  group.before(async () => {
    ioc.singleton('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return new DatabaseManager(config)
    })
    ioc.alias('Adonis/Src/Database', 'Database')

    await fs.ensureDir(path.join(__dirname, './tmp'))
    await helpers.createTables(ioc.use('Database'))
    setupResolver()
  })

  group.afterEach(async () => {
    await ioc.use('Database').table('users').truncate()
    await ioc.use('Database').table('my_users').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Database'))
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('add a new blueprint', (assert) => {
    const fn = function () {}
    Factory.blueprint('App/Model/User', fn)
    assert.deepEqual(Factory._blueprints, [{ name: 'App/Model/User', callback: fn }])
  })

  test('get model factory when accessing the blueprint', (assert) => {
    const fn = function () {}
    Factory.blueprint('App/Model/User', fn)
    assert.instanceOf(Factory.model('App/Model/User'), ModelFactory)
  })

  test('return data object from blueprint', async (assert) => {
    const fn = function () {
      return {
        name: 'virk'
      }
    }
    Factory.blueprint('App/Model/User', fn)
    const val = await Factory.model('App/Model/User')._makeOne(1)
    assert.deepEqual(val, { name: 'virk' })
  })

  test('evaluate functions in data object', async (assert) => {
    const fn = function () {
      return {
        name: () => 'virk'
      }
    }
    Factory.blueprint('App/Model/User', fn)
    const val = await Factory.model('App/Model/User')._makeOne(1)
    assert.deepEqual(val, { name: 'virk' })
  })

  test('evaluate async functions in data object', async (assert) => {
    const fn = function () {
      return {
        name: () => {
          return new Promise((resolve) => {
            resolve('virk')
          })
        }
      }
    }
    Factory.blueprint('App/Model/User', fn)
    const val = await Factory.model('App/Model/User')._makeOne(1)
    assert.deepEqual(val, { name: 'virk' })
  })

  test('make a single model instance', async (assert) => {
    Factory.blueprint('App/Model/User', () => {
      return {
        username: 'virk'
      }
    })

    class User extends Model {
    }

    ioc.fake('App/Model/User', () => {
      User._bootIfNotBooted()
      return User
    })

    const user = await Factory.model('App/Model/User').make()
    assert.instanceOf(user, User)
    assert.deepEqual(user.$attributes, { username: 'virk' })
  })

  test('make an array of model instances', async (assert) => {
    Factory.blueprint('App/Model/User', () => {
      return {
        username: 'virk'
      }
    })

    class User extends Model {
    }

    ioc.fake('App/Model/User', () => {
      User._bootIfNotBooted()
      return User
    })

    const users = await Factory.model('App/Model/User').makeMany(2)
    assert.lengthOf(users, 2)
    assert.deepEqual(users[0].$attributes, { username: 'virk' })
    assert.deepEqual(users[1].$attributes, { username: 'virk' })
  })

  test('make an array of model instances with async attributes', async (assert) => {
    Factory.blueprint('App/Model/User', () => {
      return {
        username: 'virk',
        age: () => {
          return new Promise((resolve) => {
            resolve(22)
          })
        }
      }
    })

    class User extends Model {
    }

    ioc.fake('App/Model/User', () => {
      User._bootIfNotBooted()
      return User
    })

    const users = await Factory.model('App/Model/User').makeMany(2)
    assert.lengthOf(users, 2)
    assert.deepEqual(users[0].$attributes, { username: 'virk', age: 22 })
    assert.deepEqual(users[1].$attributes, { username: 'virk', age: 22 })
  })

  test('create model instance', async (assert) => {
    Factory.blueprint('App/Model/User', () => {
      return {
        username: 'virk'
      }
    })

    class User extends Model {
    }

    ioc.fake('App/Model/User', () => {
      User._bootIfNotBooted()
      return User
    })

    const user = await Factory.model('App/Model/User').create()
    assert.isTrue(user.$persisted)
  })

  test('create many model instances', async (assert) => {
    Factory.blueprint('App/Model/User', () => {
      return {
        username: 'virk'
      }
    })

    class User extends Model {
    }

    ioc.fake('App/Model/User', () => {
      User._bootIfNotBooted()
      return User
    })

    const users = await Factory.model('App/Model/User').createMany(2)
    assert.lengthOf(users, 2)
    assert.isTrue(users[0].$persisted)
    assert.isTrue(users[1].$persisted)
  })

  test('throw exception when factory blueprint doesn\'t have a callback', async (assert) => {
    const fn = () => Factory.blueprint('App/Model/User')
    assert.throw(fn, 'E_INVALID_PARAMETER: Factory.blueprint expects a callback as 2nd parameter')
  })

  test('blueprint should receive faker instance', async (assert) => {
    assert.plan(1)

    class User extends Model {}

    ioc.fake('App/Model/User', () => {
      User._bootIfNotBooted()
      return User
    })

    Factory.blueprint('App/Model/User', (faker) => {
      assert.isFunction(faker.age)
    })
    await Factory.model('App/Model/User').make()
  })

  test('blueprint should receive index', async (assert) => {
    const indexes = []
    class User extends Model {}

    ioc.fake('App/Model/User', () => {
      User._bootIfNotBooted()
      return User
    })

    Factory.blueprint('App/Model/User', (faker, index) => {
      indexes.push(index)
    })
    await Factory.model('App/Model/User').makeMany(2)
    assert.deepEqual(indexes, [0, 1])
  })

  test('blueprint should receive extra data', async (assert) => {
    const stack = []
    class User extends Model {}

    ioc.fake('App/Model/User', () => {
      User._bootIfNotBooted()
      return User
    })

    Factory.blueprint('App/Model/User', (faker, index, data) => {
      stack.push(data)
    })
    await Factory.model('App/Model/User').makeMany(2, { username: 'virk' })
    assert.deepEqual(stack, [{ username: 'virk' }, { username: 'virk' }])
  })
})
