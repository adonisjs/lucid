
'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('../../lib/iocResolver').setFold(require('@adonisjs/fold'))
const test = require('japa')
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const VanillaSerializer = require('../../src/Lucid/Serializers/Vanilla')

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
    ioc.restore()
    await ioc.use('Adonis/Src/Database').table('users').truncate()
    await ioc.use('Adonis/Src/Database').table('cars').truncate()
    await ioc.use('Adonis/Src/Database').table('parts').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Adonis/Src/Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

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
    Car.onQuery((query) => (carQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'merc', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])

    const user = await User.find(1)
    const cars = await user.cars().fetch()
    assert.instanceOf(cars, VanillaSerializer)
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
    Car.onQuery((query) => (carQuery = query))

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

  test('eagerload relation', async (assert) => {
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
    Car.onQuery((query) => (carQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'merc', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])

    const user = await User.query().with('cars').first()
    assert.instanceOf(user.getRelated('cars'), VanillaSerializer)
    assert.equal(user.getRelated('cars').size(), 2)
    assert.deepEqual(user.getRelated('cars').rows.map((car) => car.$parent), ['User', 'User'])
    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "user_id" in (?)'))
    assert.deepEqual(carQuery.bindings, helpers.formatBindings([1]))
  })

  test('add constraints when eagerloading', async (assert) => {
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
    Car.onQuery((query) => (carQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'merc', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars', (builder) => {
      builder.where('model', '>', '2000')
    }).fetch()
    const user = users.first()
    assert.equal(user.getRelated('cars').size(), 1)
    assert.equal(user.getRelated('cars').rows[0].name, 'audi')
    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "model" > ? and "user_id" in (?)'))
    assert.deepEqual(carQuery.bindings, helpers.formatBindings(['2000', 1]))
  })

  test('return serailizer instance when nothing exists', async (assert) => {
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
    Car.onQuery((query) => (carQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    const users = await User.query().with('cars').fetch()
    const user = users.first()
    assert.equal(user.getRelated('cars').size(), 0)
    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "user_id" in (?)'))
    assert.deepEqual(carQuery.bindings, helpers.formatBindings([1]))
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'merc', model: '1990' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').fetch()
    const json = users.toJSON()
    assert.equal(json[0].cars[0].name, 'merc')
    assert.equal(json[1].cars[0].name, 'audi')
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'merc', model: '1990' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').fetch()
    const json = users.toJSON()
    assert.equal(json[0].cars[0].name, 'merc')
    assert.equal(json[1].cars[0].name, 'audi')
  })

  test('calling toJSON should build right json structure', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'merc', model: '1990' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').fetch()
    const json = users.toJSON()
    assert.equal(json[0].cars[0].name, 'merc')
    assert.equal(json[1].cars[0].name, 'audi')
  })

  test('should work with nested relations', async (assert) => {
    class Part extends Model {
    }

    class Car extends Model {
      parts () {
        return this.hasMany(Part)
      }
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Part._bootIfNotBooted()
    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let carQuery = null
    let partQuery = null
    Car.onQuery((query) => (carQuery = query))
    Part.onQuery((query) => (partQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])
    await ioc.use('Database').table('parts').insert([
      { car_id: 1, part_name: 'wheels' },
      { car_id: 1, part_name: 'engine' },
      { car_id: 2, part_name: 'wheels' },
      { car_id: 2, part_name: 'engine' }
    ])

    const user = await User.query().with('cars.parts').first()
    assert.equal(user.getRelated('cars').size(), 2)
    assert.equal(user.getRelated('cars').first().getRelated('parts').size(), 2)
    assert.equal(user.getRelated('cars').last().getRelated('parts').size(), 2)
    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "user_id" in (?)'))
    assert.equal(partQuery.sql, helpers.formatQuery('select * from "parts" where "car_id" in (?, ?)'))
  })

  test('add query constraint to nested query', async (assert) => {
    class Part extends Model {
    }

    class Car extends Model {
      parts () {
        return this.hasMany(Part)
      }
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Part._bootIfNotBooted()
    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let carQuery = null
    let partQuery = null
    Car.onQuery((query) => (carQuery = query))
    Part.onQuery((query) => (partQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])
    await ioc.use('Database').table('parts').insert([
      { car_id: 1, part_name: 'wheels' },
      { car_id: 1, part_name: 'engine' },
      { car_id: 2, part_name: 'wheels' },
      { car_id: 2, part_name: 'engine' }
    ])

    const user = await User.query().with('cars.parts', (builder) => builder.where('part_name', 'engine')).first()
    assert.equal(user.getRelated('cars').size(), 2)
    assert.equal(user.getRelated('cars').first().getRelated('parts').size(), 1)
    assert.equal(user.getRelated('cars').last().getRelated('parts').size(), 1)
    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "user_id" in (?)'))
    assert.equal(partQuery.sql, helpers.formatQuery('select * from "parts" where "part_name" = ? and "car_id" in (?, ?)'))
  })

  test('add query constraint to child and grand child query', async (assert) => {
    class Part extends Model {
    }

    class Car extends Model {
      parts () {
        return this.hasMany(Part)
      }
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Part._bootIfNotBooted()
    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let carQuery = null
    let partQuery = null
    Car.onQuery((query) => (carQuery = query))
    Part.onQuery((query) => (partQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])
    await ioc.use('Database').table('parts').insert([
      { car_id: 1, part_name: 'wheels' },
      { car_id: 1, part_name: 'engine' },
      { car_id: 2, part_name: 'wheels' },
      { car_id: 2, part_name: 'engine' }
    ])

    const user = await User.query().with('cars', (builder) => {
      builder.where('name', 'audi').with('parts', (builder) => builder.where('part_name', 'engine'))
    }).first()

    assert.equal(user.getRelated('cars').size(), 1)
    assert.equal(user.getRelated('cars').first().getRelated('parts').size(), 1)
    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "name" = ? and "user_id" in (?)'))
    assert.equal(partQuery.sql, helpers.formatQuery('select * from "parts" where "part_name" = ? and "car_id" in (?)'))
  })

  test('get relation count', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])

    const user = await User.query().withCount('cars').first()
    assert.deepEqual(user.$sideLoaded, { cars_count: helpers.formatNumber(2) })
    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "cars" where "users"."id" = "cars"."user_id") as "cars_count" from "users" limit ?'))
  })

  test('filter parent based upon child', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' }
    ])

    const users = await User.query().has('cars').fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "cars" where "users"."id" = "cars"."user_id")'))
  })

  test('define minimum count via has', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().has('cars', '>=', 2).fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where (select count(*) from "cars" where "users"."id" = "cars"."user_id") >= ?'))
  })

  test('add additional constraints via where has', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().whereHas('cars', (builder) => {
      return builder.where('name', 'audi')
    }).fetch()
    assert.equal(users.size(), 2)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "cars" where "name" = ? and "users"."id" = "cars"."user_id")'))
  })

  test('add additional constraints and count constraints at same time', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().whereHas('cars', (builder) => {
      return builder.where('name', 'audi')
    }, '>', 1).fetch()
    assert.equal(users.size(), 0)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where (select count(*) from "cars" where "name" = ? and "users"."id" = "cars"."user_id") > ?'))
  })

  test('add orWhereHas clause', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().whereHas('cars', (builder) => {
      return builder.where('name', 'audi')
    }, '>', 1).orWhereHas('cars', (builder) => builder.where('name', 'mercedes')).fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where (select count(*) from "cars" where "name" = ? and "users"."id" = "cars"."user_id") > ? or exists (select * from "cars" where "name" = ? and "users"."id" = "cars"."user_id")'))
  })

  test('paginate records', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').paginate()
    assert.equal(users.size(), 2)
    assert.deepEqual(users.pages, { total: helpers.formatNumber(2), perPage: 20, page: 1, lastPage: 1 })
  })

  test('convert paginated records to json', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('cars').insert([
      { user_id: 1, name: 'mercedes', model: '1990' },
      { user_id: 1, name: 'audi', model: '2001' },
      { user_id: 2, name: 'audi', model: '2001' }
    ])

    const users = await User.query().with('cars').paginate()
    const json = users.toJSON()
    assert.deepEqual(json.total, helpers.formatNumber(2))
    assert.deepEqual(json.perPage, 20)
    assert.deepEqual(json.page, 1)
    assert.deepEqual(json.lastPage, 1)
    assert.isArray(json.data)
    assert.isArray(json.data[0].cars)
    assert.isArray(json.data[1].cars)
  })

  test('save related model instance', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const mercedes = new Car()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    await user.cars().save(mercedes)
    assert.equal(mercedes.user_id, user.id)
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
  })

  test('create related model instance', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const mercedes = await user.cars().create({ name: 'mercedes', model: '1992' })
    assert.equal(mercedes.user_id, 1)
    assert.equal(mercedes.user_id, user.id)
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
  })

  test('persist parent model when isNew', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = await user.cars().create({ name: 'mercedes', model: '1992' })
    assert.equal(mercedes.user_id, 1)
    assert.equal(mercedes.user_id, user.id)
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('persist parent model when isNew while calling save', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = new Car()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    await user.cars().save(mercedes)
    assert.equal(mercedes.user_id, 1)
    assert.equal(mercedes.user_id, user.id)
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('saveMany of related instances', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const mercedes = new Car()
    mercedes.name = 'mercedes'
    mercedes.model = '1992'

    const ferrari = new Car()
    ferrari.name = 'ferrari'
    ferrari.model = '2002'

    await user.cars().saveMany([mercedes, ferrari])
    assert.equal(mercedes.user_id, 1)
    assert.equal(mercedes.user_id, user.id)
    assert.equal(ferrari.user_id, user.id)
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(ferrari.isNew)
    assert.isTrue(ferrari.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('createMany of related instances', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    const [mercedes, ferrari] = await user.cars().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])

    assert.equal(mercedes.user_id, 1)
    assert.equal(mercedes.user_id, user.id)
    assert.equal(ferrari.user_id, user.id)
    assert.isTrue(mercedes.$persisted)
    assert.isFalse(ferrari.isNew)
    assert.isTrue(ferrari.$persisted)
    assert.isFalse(mercedes.isNew)
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('delete related rows', async (assert) => {
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
    Car.onQuery((query) => (carQuery = query))

    const user = new User()
    user.username = 'virk'

    await user.cars().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])
    await user.cars().delete()
    const cars = await ioc.use('Database').table('cars')
    assert.lengthOf(cars, 0)
    assert.equal(carQuery.sql, helpers.formatQuery('delete from "cars" where "user_id" = ?'))
  })

  test('add constraints to delete query', async (assert) => {
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
    Car.onQuery((query) => (carQuery = query))

    const user = new User()
    user.username = 'virk'

    await user.cars().createMany([{ name: 'mercedes', model: '1992' }, { name: 'ferrari', model: '2002' }])
    await user.cars().where('name', 'mercedes').delete()
    const cars = await ioc.use('Database').table('cars')
    assert.lengthOf(cars, 1)
    assert.equal(cars[0].name, 'ferrari')
    assert.equal(carQuery.sql, helpers.formatQuery('delete from "cars" where "name" = ? and "user_id" = ?'))
  })

  test('throw exception when createMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.cars().createMany({ name: 'mercedes', model: '1992' })
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: hasMany.createMany expects an array of values instead received object')
    }
  })

  test('throw exception when saveMany doesn\'t receives an array', async (assert) => {
    assert.plan(1)

    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'

    try {
      await user.cars().saveMany(new Car())
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_PARAMETER: hasMany.saveMany expects an array of related model instances instead received object')
    }
  })

  test('get first instance of related model via IoC container', async (assert) => {
    class Car extends Model {
    }

    ioc.fake('App/Models/Car', () => Car)

    class User extends Model {
      cars () {
        return this.hasMany('App/Models/Car')
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let carQuery = null
    Car.onQuery((query) => (carQuery = query))

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

  test('bind custom callback for eagerload query', async (assert) => {
    class Car extends Model {
    }

    ioc.fake('App/Models/Car', () => Car)

    class User extends Model {
      cars () {
        return this.hasMany('App/Models/Car')
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    let carQuery = null
    Car.onQuery((query) => (carQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })

    await User.query().with('cars', (builder) => {
      builder.eagerLoadQuery((query, fk, values) => {
        query.whereIn(fk, values).where('model', 'BMW')
      })
    }).fetch()

    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "user_id" in (?) and "model" = ?'))
    assert.deepEqual(carQuery.bindings, helpers.formatBindings([1, 'BMW']))
  })

  test('withCount work fine with self relations', async (assert) => {
    class User extends Model {
      teamMembers () {
        return this.hasMany(User, 'id', 'manager_id')
      }
    }

    User._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([
      {
        username: 'virk'
      },
      {
        username: 'nikk',
        manager_id: 1
      },
      {
        username: 'prasan',
        manager_id: 1
      }
    ])

    const results = await User.query().withCount('teamMembers').fetch()

    const expectedQuery = 'select *, (select count(*) from "users" as "sj_0" where "users"."id" = "sj_0"."manager_id") as "teamMembers_count" from "users"'

    assert.equal(results.first().$sideLoaded.teamMembers_count, 2)
    assert.equal(results.rows[1].$sideLoaded.teamMembers_count, 0)
    assert.equal(results.last().$sideLoaded.teamMembers_count, 0)
    assert.equal(userQuery.sql, helpers.formatQuery(expectedQuery))
  })

  test('apply global scope on related model when eagerloading', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    Car.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    let carQuery = null
    Car.onQuery((query) => (carQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await User.query().with('cars').fetch()

    assert.equal(carQuery.sql, helpers.formatQuery('select * from "cars" where "user_id" in (?, ?) and "deleted_at" is null'))
  })

  test('apply global scope on related model when called withCount', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    Car.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await User.query().withCount('cars').fetch()

    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "cars" where "users"."id" = "cars"."user_id" and "cars"."deleted_at" is null) as "cars_count" from "users"'))
  })

  test('apply global scope on related model when called has', async (assert) => {
    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    Car.addGlobalScope(function (builder) {
      builder.where(`${builder.Model.table}.deleted_at`, null)
    })

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await User.query().has('cars').fetch()

    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "cars" where "users"."id" = "cars"."user_id" and "cars"."deleted_at" is null)'))
  })
})
