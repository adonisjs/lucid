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
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const CollectionSerializer = require('../../src/Lucid/Serializers/Collection')

test.group('Relations | Has Many', (group) => {
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
    await helpers.createTables(ioc.use('Adonis/Src/Database'))
  })

  group.afterEach(async () => {
    await ioc.use('Adonis/Src/Database').table('users').truncate()
    await ioc.use('Adonis/Src/Database').table('cars').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Adonis/Src/Database'))
    await fs.remove(path.join(__dirname, './tmp'))
  })

  test('get instance of has many when calling to relation method', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let carQuery = null
    Car.onQuery((query) => carQuery = query)

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'merc', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])

    const user = await User.find(1)
    const cars = await user.cars().fetch()
    assert.instanceOf(cars, CollectionSerializer)
    assert.equal(cars.size(), 2)
    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "user_id" = ?'))
    assert.deepEqual(carQuery.bindings, helpers.formatBindings([1]))
  })

  test('get first instance of related model', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let carQuery = null
    Car.onQuery((query) => carQuery = query)

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'merc', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])

    const user = await User.find(1)
    const car = await user.cars().first()
    assert.instanceOf(car, Car)
    assert.equal(car.name, 'merc')
    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "user_id" = ? limit ?'))
    assert.deepEqual(carQuery.bindings, helpers.formatBindings([1, 1]))
  })
})
