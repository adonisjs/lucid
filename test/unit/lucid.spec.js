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
const moment = require('moment')
const _ = require('lodash')
const { ioc } = require('@adonisjs/fold')
const { Config, setupResolver } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const VanillaSerializer = require('../../src/Lucid/Serializers/Vanilla')

test.group('Model', (group) => {
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
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('run queries using query builder', (assert) => {
    class User extends Model {}
    User._bootIfNotBooted()
    const query = User.query().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users"'))
  })

  test('define different table for a model', (assert) => {
    class User extends Model {
      static get table () {
        return 'my_users'
      }
    }

    User._bootIfNotBooted()
    const query = User.query().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "my_users"'))
  })

  test('define table prefix for a model', (assert) => {
    class User extends Model {
      static get prefix () {
        return 'my_'
      }
    }

    User._bootIfNotBooted()
    const query = User.query().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "my_users"'))
  })

  test('call the boot method only once', (assert) => {
    let callCounts = 0
    class User extends Model {
      static boot () {
        super.boot()
        callCounts++
      }
    }

    User._bootIfNotBooted()
    User._bootIfNotBooted()
    assert.equal(callCounts, 1)
  })

  test('should be able to define model attributes on model instance', (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = new User()
    user.fill({ username: 'virk', age: 22 })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 22 })
  })

  test('remove existing attributes when calling fill', (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = new User()
    user.fill({ username: 'virk', age: 22 })
    user.fill({ username: 'virk' })
    assert.deepEqual(user.$attributes, { username: 'virk' })
  })

  test('call setters when defining attributes via fill', (assert) => {
    class User extends Model {
      setUsername (username) {
        return username.toUpperCase()
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.fill({ username: 'virk', age: 22 })
    assert.deepEqual(user.$attributes, { username: 'VIRK', age: 22 })
  })

  test('do not remove attribute values when calling merge', (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = new User()
    user.fill({ username: 'virk', age: 22 })
    user.merge({ age: 23 })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 23 })
  })

  test('call setters when defining attributes via merge', (assert) => {
    class User extends Model {
      setUsername (username) {
        return username.toUpperCase()
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.merge({ username: 'virk', age: 22 })
    assert.deepEqual(user.$attributes, { username: 'VIRK', age: 22 })
  })

  test('call setters when defining attributes manually', (assert) => {
    class User extends Model {
      setUsername (username) {
        return username.toUpperCase()
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    assert.deepEqual(user.$attributes, { username: 'VIRK' })
  })

  test('save attributes to the database and update model state', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('return proper primary key value using primaryKeyValue getter', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.equal(user.primaryKeyValue, 1)
  })

  test('define different primary key for a given model', async (assert) => {
    class User extends Model {
      static get primaryKey () {
        return 'uuid'
      }

      static get table () {
        return 'my_users'
      }

      static get incrementing () {
        return false
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    user.uuid = 112000
    await user.save()

    assert.equal(user.primaryKeyValue, 112000)
    assert.equal(user.primaryKeyValue, user.uuid)
  })

  test('add hook for a given type', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addHook('beforeCreate', function () {})
    User.addHook('afterCreate', function () {})

    assert.lengthOf(User.$hooks.before._handlers.create, 1)
    assert.lengthOf(User.$hooks.after._handlers.create, 1)
  })

  test('add hooks as an array', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addHook('beforeCreate', [function () {}, function () {}])
    assert.lengthOf(User.$hooks.before._handlers.create, 2)
  })

  test('throw exception when hook cycle is invalid', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const fn = () => User.addHook('orCreate', function () {
    })
    assert.throw(fn, 'E_INVALID_PARAMETER: Invalid hook event {orCreate}')
  })

  test('call before and after create hooks when saving the model for first time', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const stack = []
    User.addHook('beforeCreate', function () {
      stack.push('before')
    })

    User.addHook('afterCreate', function () {
      stack.push('after')
    })

    const user = new User()
    await user.save()
    assert.deepEqual(stack, ['before', 'after'])
  })

  test('abort insert if before create throws an exception', async (assert) => {
    assert.plan(2)
    class User extends Model {
    }

    User._bootIfNotBooted()

    User.addHook('beforeCreate', function () {
      throw new Error('Something bad happened')
    })

    User.addHook('afterCreate', function () {})

    const user = new User()
    try {
      await user.save()
    } catch ({ message }) {
      assert.equal(message, 'Something bad happened')
      const users = await ioc.use('Database').table('users')
      assert.lengthOf(users, 0)
    }
  })

  test('update model when already persisted', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()
    user.username = 'nikk'
    await user.save()
    const users = await ioc.use('Database').table('users')
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, user.username)
    assert.equal(users[0].id, user.primaryKeyValue)
  })

  test('only update when there are dirty values', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const queries = []
    User.onQuery((query) => queries.push(query))

    const user = new User()
    user.username = 'virk'
    await user.save()
    await user.save()

    assert.lengthOf(queries, 1)
    assert.equal(queries[0].sql, helpers.addReturningStatement(
      helpers.formatQuery('insert into "users" ("created_at", "updated_at", "username") values (?, ?, ?)'),
      'id'
    ))
  })

  test('update model for multiple times', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const queries = []
    User.onQuery((query) => queries.push(query))

    const user = new User()
    user.username = 'virk'
    await user.save()
    await helpers.sleep(1000)

    user.username = 'nikk'
    await user.save()

    await helpers.sleep(1000)
    user.username = 'virk'
    await user.save()

    assert.lengthOf(queries, 3)
    assert.equal(queries[0].sql, helpers.addReturningStatement(
      helpers.formatQuery('insert into "users" ("created_at", "updated_at", "username") values (?, ?, ?)'),
      'id'
    ))
    assert.equal(queries[1].sql, helpers.formatQuery('update "users" set "username" = ?, "updated_at" = ? where "id" = ?'))
    assert.deepEqual(queries[1].bindings[0], 'nikk')
    assert.equal(queries[2].sql, helpers.formatQuery('update "users" set "username" = ?, "updated_at" = ? where "id" = ?'))
    assert.deepEqual(queries[2].bindings[0], 'virk')
    assert.deepEqual(user.dirty, {})
  }).timeout(6000)

  test('set timestamps automatically', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isDefined(user.created_at)
    assert.isDefined(user.updated_at)
  })

  test('do not set timestamps when columns are not defined', async (assert) => {
    class User extends Model {
      static get createdAtColumn () {
        return null
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isUndefined(user.created_at)
    assert.isDefined(user.updated_at)
  })

  test('return serializer instance when calling fetch', async (assert) => {
    class User extends Model {
    }
    User._bootIfNotBooted()
    await ioc.use('Database').insert({ username: 'virk' }).into('users')
    const users = await User.query().fetch()
    assert.instanceOf(users, VanillaSerializer)
  })

  test('collection toJSON should call model toJSON and getters', async (assert) => {
    class User extends Model {
      getCreatedAt (date) {
        return date.fromNow()
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()

    const users = await User.query().fetch()
    const json = users.toJSON()
    assert.equal(json[0].created_at, 'a few seconds ago')
  })

  test('update model over insert when fetched from database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    let userQuery = null
    User.onQuery(function (query) {
      userQuery = query
    })

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    const users = await User.query().fetch()
    const user = users.first()
    user.username = 'nikk'
    await user.save()
    assert.equal(userQuery.sql, helpers.formatQuery('update "users" set "username" = ?, "updated_at" = ? where "id" = ?'))
  })

  test('call update hooks when updating model', async (assert) => {
    const stack = []
    class User extends Model {
      static boot () {
        super.boot()
        this.addHook('beforeUpdate', function () {
          stack.push('before')
        })

        this.addHook('afterUpdate', function () {
          stack.push('after')
        })
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'nikk'
    await user.save()
    user.username = 'virk'
    await user.save()
    assert.deepEqual(stack, ['before', 'after'])
  })

  test('call save hooks when updating or creating model', async (assert) => {
    const stack = []
    class User extends Model {
      static boot () {
        super.boot()
        this.addHook('beforeSave', function (model) {
          stack.push(`before:${model.$persisted}`)
        })

        this.addHook('afterSave', function () {
          stack.push('after')
        })
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'nikk'
    await user.save()
    user.username = 'virk'
    await user.save()
    assert.deepEqual(stack, ['before:false', 'after', 'before:true', 'after'])
  })

  test('update updated_at timestamp for mass updates', async (assert) => {
    class User extends Model {
      static get dates () {
        const dates = super.dates
        dates.push('login_at')
        return dates
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await User.query().where('username', 'virk').update({ login_at: new Date() })
    const users = await ioc.use('Database').table('users').orderBy('id', 'asc')
    assert.equal(moment(users[0].updated_at).format('YYYY-MM-DD'), moment().format('YYYY-MM-DD'))
  })

  test('attach computed properties to the final output', async (assert) => {
    class User extends Model {
      static get computed () {
        return ['full_name']
      }

      getFullName ({ username }) {
        return `Mr. ${username}`
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.query().where('username', 'virk').fetch()
    assert.equal(users.first().toObject().full_name, 'Mr. virk')
  })

  test('only pick visible fields', async (assert) => {
    class User extends Model {
      static get visible () {
        return ['created_at']
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.query().where('username', 'virk').fetch()
    assert.deepEqual(Object.keys(users.first().toObject()), ['created_at'])
  })

  test('omit hidden fields', async (assert) => {
    class User extends Model {
      static get hidden () {
        return ['created_at']
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.query().where('username', 'virk').fetch()
    assert.deepEqual(Object.keys(users.first().toObject()), [
      'id',
      'vid',
      'country_id',
      'manager_id',
      'lead_id',
      'age',
      'username',
      'email',
      'updated_at',
      'type',
      'login_at',
      'deleted_at'
    ])
  })

  test('apply all global scopes to the query builder', async (assert) => {
    class User extends Model {
    }
    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    const query = User.query().where('username', 'virk').toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users" where "username" = ? and "deleted_at" is null'))
  })

  test('instruct query builder to ignore all query scopes', async (assert) => {
    class User extends Model {
    }
    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    const query = User.query().where('username', 'virk').ignoreScopes()._applyScopes().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users" where "username" = ?'))
  })

  test('instruct query builder to ignore selected scopes', async (assert) => {
    class User extends Model {
    }
    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    }, 'softDeletes')

    User.addGlobalScope(function (builder) {
      builder.whereNot('login_at', null)
    }, 'loggedOnce')

    const query = User.query().where('username', 'virk').ignoreScopes(['softDeletes']).toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users" where "username" = ? and "login_at" is not null'))
  })

  test('call query scopes when fetching data', async (assert) => {
    let userQuery = null
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    User.onQuery(function (query) {
      userQuery = query
    })

    await User.query().where('username', 'virk').fetch()
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "username" = ? and "deleted_at" is null'))
  })

  test('call query scopes when bulk updating data', async (assert) => {
    let userQuery = null
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    User.onQuery(function (query) {
      userQuery = query
    })

    await User.query().where('username', 'virk').update({ login_at: new Date() })
    assert.equal(userQuery.sql, helpers.formatQuery('update "users" set "login_at" = ?, "updated_at" = ? where "username" = ? and "deleted_at" is null'))
  })

  test('define local scopes', async (assert) => {
    class User extends Model {
      static scopeIsLogged (builder) {
        builder.whereNotNull('login_at')
      }
    }

    User._bootIfNotBooted()

    const query = User.query().where('username', 'virk').isLogged().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users" where "username" = ? and "login_at" is not null'))
  })

  test('pass arguments to local scopes', async (assert) => {
    class User extends Model {
      static scopeIsLogged (builder, time) {
        builder.where('login_at', '>', time)
      }
    }

    User._bootIfNotBooted()

    const date = new Date()
    const query = User.query().where('username', 'virk').isLogged(date).toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users" where "username" = ? and "login_at" > ?'))
    assert.deepEqual(query.bindings, helpers.formatBindings(['virk', date]))
  })

  test('find model instance using find method', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const userId = await ioc.use('Database').table('users').insert({ username: 'virk' }).returning('id')
    const user = await User.find(userId[0])
    assert.instanceOf(user, User)
    assert.equal(user.username, 'virk')
    assert.isFalse(user.isNew)
    assert.isFalse(user.isDirty)
  })

  test('find with a single where clause', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert({ username: 'virk' })
    const user = await User.findBy('username', 'virk')
    assert.instanceOf(user, User)
    assert.equal(user.username, 'virk')
    assert.isFalse(user.isNew)
    assert.isFalse(user.isDirty)
  })

  test('call after find hooks on findBy', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    const stack = []
    User.addHook('afterFind', async function () {
      await helpers.sleep(1)
      stack.push('afterFind')
    })

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await User.findBy('username', 'virk')
    assert.deepEqual(stack, ['afterFind'])
  })

  test('pass model instance to after find hook', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    let hookInstance = null
    User.addHook('afterFind', function (model) {
      hookInstance = model
    })

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    const user = await User.findBy('username', 'virk')
    assert.deepEqual(hookInstance, user)
  })

  test('return everything from the database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    const users = await User.all()
    assert.instanceOf(users, VanillaSerializer)
  })
  test('return the latest record with the querybuilder from the database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('users').insert({ username: 'romain' })
    const user = await User.query().last()
    assert.equal(user.username, 'romain')
  })

  test('return the latest record with the querybuilder from the database with a specified field', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('users').insert({ username: 'romain' })
    const user = await User.query().last('username')
    assert.equal(user.username, 'virk')
  })

  test('return the latest record from the database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('users').insert({ username: 'romain' })
    const user = await User.last()
    assert.equal(user.username, 'romain')
  })

  test('return the latest record from the database with a specified field', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('users').insert({ username: 'romain' })
    const user = await User.last('username')
    assert.equal(user.username, 'virk')
  })

  test('pick x number of rows from database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.pick(1)
    assert.instanceOf(users, VanillaSerializer)
    assert.equal(users.size(), 1)
    assert.equal(users.first().username, 'virk')
  })

  test('pick inverse x number of rows from database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.pickInverse(1)
    assert.instanceOf(users, VanillaSerializer)
    assert.equal(users.size(), 1)
    assert.equal(users.first().username, 'nikk')
  })

  test('return an array of ids from the database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const userIds = await User.ids()
    assert.deepEqual(userIds, [1, 2])
  })

  test('return an array of ids from the database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const userIds = await User.ids()
    assert.deepEqual(userIds, [1, 2])
  })

  test('return a pair of key/values from the database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.pair('id', 'username')
    assert.deepEqual(users, { 1: 'virk', 2: 'nikk' })
  })

  test('paginate model', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.query().paginate(1, 1)
    assert.instanceOf(users, VanillaSerializer)
    assert.deepEqual(users.pages, { perPage: 1, total: helpers.formatNumber(2), page: 1, lastPage: 2 })
    assert.equal(users.first().username, 'virk')
  })

  test('return first row from database on calling static first method', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const user = await User.first()
    assert.instanceOf(user, User)
    assert.equal(user.username, 'virk')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" order by "id" asc limit ?'))
  })

  test('get string representation of a query', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const queryString = User.query().where('username', 'virk').toString()
    assert.equal(queryString, helpers.formatQuery('select * from "users" where "username" = \'virk\''))
  })

  test('auto format dates via formatDates when creating', async (assert) => {
    const formatting = []

    class User extends Model {
      static formatDates (key, value) {
        const formattedValue = super.formatDates(key, value)
        formatting.push({ key, value: formattedValue })
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()
    const keys = formatting.map((item) => item.key)
    const values = formatting.map((item) => moment(item.value, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.deepEqual(keys, ['created_at', 'updated_at'])
    assert.deepEqual(values, [true, true])
  })

  test('auto format just updated_at via formatDates when updating', async (assert) => {
    const formatting = []

    class User extends Model {
      static formatDates (key, value) {
        const formattedValue = super.formatDates(key, value)
        formatting.push({ key, value: formattedValue })
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert({ username: 'virk' })
    const user = await User.find(1)
    user.username = 'nikk'
    await user.save()
    const keys = formatting.map((item) => item.key)
    const values = formatting.map((item) => moment(item.value, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.deepEqual(keys, ['updated_at'])
    assert.deepEqual(values, [true])
  })

  test('auto format when bulk updating', async (assert) => {
    const formatting = []

    class User extends Model {
      static formatDates (key, value) {
        const formattedValue = super.formatDates(key, value)
        formatting.push({ key, value: formattedValue })
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await User.query().where('username', 'virk').update({ username: 'nikk' })
    const keys = formatting.map((item) => item.key)
    const values = formatting.map((item) => moment(item.value, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.deepEqual(keys, ['updated_at'])
    assert.deepEqual(values, [true])
  })

  test('do not mutate bulk updates object', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert({ username: 'virk' })
    const updates = { username: 'nikk' }
    await User.query().where('username', 'virk').update(updates)
    assert.deepEqual(updates, { username: 'nikk' })
  })

  test('mutate model attributes when date is formatted', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()
    const timestamps = _(user.$attributes)
      .pick(['created_at', 'updated_at'])
      .map((item) => {
        return moment(item.toString(), 'YYYY-MM-DD HH:mm:ss', true).isValid()
      })
      .value()

    assert.deepEqual(timestamps, [true, true])
  })

  test('do not call formatDates when setters for them are defined', async (assert) => {
    const formatting = []

    class User extends Model {
      static formatDates (key, value) {
        const formattedValue = super.formatDates(key, value)
        formatting.push({ key, value: formattedValue })
        return formattedValue
      }

      setCreatedAt () {
        return null
      }
    }

    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    const keys = formatting.map((item) => item.key)
    const values = formatting.map((item) => moment(item.value, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.deepEqual(keys, ['updated_at'])
    assert.deepEqual(values, [true])
    assert.isNull(user.created_at)
  })

  test('do not call formatDates when not part of dates', async (assert) => {
    const formatting = []

    class User extends Model {
      static formatDates (key, value) {
        const formattedValue = super.formatDates(key, value)
        formatting.push({ key, value: formattedValue })
        return formattedValue
      }

      static get createdAtColumn () {
        return null
      }
    }

    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    const keys = formatting.map((item) => item.key)
    const values = formatting.map((item) => moment(item.value, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.deepEqual(keys, ['updated_at'])
    assert.deepEqual(values, [true])
    assert.isUndefined(user.created_at)
  })

  test('use setter value when bulk updating and do not call formatDates', async (assert) => {
    const formatting = []

    class User extends Model {
      static formatDates (key, value) {
        const formattedValue = super.formatDates(key, value)
        formatting.push({ key, value: formattedValue })
        return formattedValue
      }

      setUpdatedAt () {
        return null
      }
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await User.query().where('username', 'virk').update({ username: 'nikk' })
    const users = await User.query().pair('id', 'updated_at')
    assert.deepEqual(users, { '1': null })
    assert.deepEqual(formatting, [])
  })

  test('call castDates when toJSON or toObject is called', async (assert) => {
    const casting = []

    class User extends Model {
      static castDates (key, value) {
        const formattedValue = super.castDates(key, value)
        casting.push({ key, value: formattedValue })
        return formattedValue
      }
    }

    User._bootIfNotBooted()

    await ioc.use('Database')
      .table('users')
      .insert({ username: 'virk', created_at: new Date(), updated_at: new Date() })

    const user = await User.find(1)
    const json = user.toObject()
    assert.isTrue(moment(json.created_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.isTrue(moment(json.updated_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.deepEqual(casting.map((field) => field.key), ['created_at', 'updated_at'])
  })

  test('do not cast date when field not defined as date', async (assert) => {
    const casting = []

    class User extends Model {
      static castDates (key, value) {
        const formattedValue = value.format('YYYY-MM-DD')
        casting.push({ key, value: formattedValue })
        return formattedValue
      }

      static get createdAtColumn () {
        return null
      }
    }

    User._bootIfNotBooted()

    await ioc.use('Database')
      .table('users')
      .insert({ username: 'virk', created_at: new Date(), updated_at: new Date() })

    const user = await User.find(1)
    const json = user.toObject()
    assert.isFalse(moment(json.created_at.toString(), 'YYYY-MM-DD', true).isValid())
    assert.isTrue(moment(json.updated_at.toString(), 'YYYY-MM-DD', true).isValid())
    assert.deepEqual(casting.map((field) => field.key), ['updated_at'])
  })

  test('do not cast date when field has a getter', async (assert) => {
    const casting = []

    class User extends Model {
      static castDates (key, value) {
        const formattedValue = super.castDates(key, value)
        casting.push({ key, value: formattedValue })
        return formattedValue
      }

      getCreatedAt (value) {
        return value.fromNow(true)
      }
    }

    User._bootIfNotBooted()

    await ioc.use('Database')
      .table('users')
      .insert({ username: 'virk', created_at: new Date(), updated_at: new Date() })

    const user = await User.find(1)
    const json = user.toObject()
    assert.equal(json.created_at, 'a few seconds')
    assert.deepEqual(casting.map((field) => field.key), ['updated_at'])
  })

  test('cast dates should work for custom dates as well', async (assert) => {
    const casting = []

    class User extends Model {
      static castDates (key, value) {
        const formattedValue = super.castDates(key, value)
        casting.push({ key, value: formattedValue })
        return formattedValue
      }

      static get dates () {
        const existingDates = super.dates
        existingDates.push('login_at')
        return existingDates
      }
    }

    User._bootIfNotBooted()

    await ioc.use('Database')
      .table('users')
      .insert({ username: 'virk', created_at: new Date(), updated_at: new Date(), login_at: new Date() })

    const user = await User.find(1)
    const json = user.toObject()
    assert.isTrue(moment(json.created_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.isTrue(moment(json.updated_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.isTrue(moment(json.login_at, 'YYYY-MM-DD HH:mm:ss', true).isValid())
    assert.deepEqual(casting.map((field) => field.key), ['created_at', 'updated_at', 'login_at'])
  })

  test('create model instance and persist it to database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = await User.create({ username: 'virk' })
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('reset a table in the database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const user = await User.create({ username: 'virk' })
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)

    await User.truncate()

    const users = await User.all()
    assert.equal(users.rows.length, 0)
  })

  test('further changes to instance returned by create should update the model', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    const user = await User.create({ username: 'virk' })
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)

    await helpers.sleep(1000)
    user.username = 'nikk'
    await user.save()

    assert.equal(userQuery.sql, helpers.formatQuery('update "users" set "username" = ?, "updated_at" = ? where "id" = ?'))
  }).timeout(6000)

  test('should be able to delete the model instance', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    const user = await User.create({ username: 'virk' })
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
    await user.delete()
    const fn = () => {
      user.username = 'virk'
    }

    assert.isTrue(user.isDeleted)
    assert.throw(fn, 'E_DELETED_MODEL: Cannot edit deleted model instance for User model')
    assert.equal(userQuery.sql, helpers.formatQuery('delete from "users" where "id" = ?'))
  })

  test('ignore global scopes when deleting model', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('username', 'virk')
    })

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    const user = await User.create({ username: 'virk' })
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
    await user.delete()
    const fn = () => {
      user.username = 'virk'
    }

    assert.isTrue(user.isDeleted)
    assert.throw(fn, 'E_DELETED_MODEL: Cannot edit deleted model instance for User model')
    assert.equal(userQuery.sql, helpers.formatQuery('delete from "users" where "id" = ?'))
  })

  test('create an array of models', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    const users = await User.createMany([{ username: 'virk' }, { username: 'nikk' }])
    assert.isArray(users)
    assert.isTrue(users[0].$persisted)
    assert.isFalse(users[0].isNew)
    assert.isTrue(users[1].$persisted)
    assert.isFalse(users[1].isNew)
  })

  test('run create hooks for all the models to be created via createMany', async (assert) => {
    const stack = []

    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addHook('beforeCreate', (ctx) => {
      stack.push(ctx.username)
    })

    await User.createMany([{ username: 'virk' }, { username: 'nikk' }])
    assert.deepEqual(stack, ['virk', 'nikk'])
  })

  test('throw an exception when createMany doesn\'t recieves an array', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    User._bootIfNotBooted()
    try {
      await User.createMany({ username: 'virk' })
    } catch ({ message }) {
      assert.match(message, /E_INVALID_PARAMETER: User.createMany expects an array of values instead received object/)
    }
  })

  test('throw exception when unable to find row', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    User._bootIfNotBooted()

    try {
      await User.findOrFail(1)
    } catch ({ message }) {
      assert.match(message, /^E_MISSING_DATABASE_ROW: Cannot find database row for User model/)
    }
  })

  test('throw exception when unable to find row via findByOrFail', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    User._bootIfNotBooted()

    try {
      await User.findByOrFail('username', 'virk')
    } catch ({ message }) {
      assert.match(message, /^E_MISSING_DATABASE_ROW: Cannot find database row for User model/)
    }
  })

  test('throw exception via firstOrFail', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    User._bootIfNotBooted()

    try {
      await User.firstOrFail()
    } catch ({ message }) {
      assert.match(message, /^E_MISSING_DATABASE_ROW: Cannot find database row for User model/)
    }
  })

  test('return model instance findByOrFail finds row', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    const user = await User.findByOrFail('username', 'virk')
    assert.instanceOf(user, User)
  })

  test('delete existing model instance', async (assert) => {
    assert.plan(3)
    class User extends Model {
    }
    User._bootIfNotBooted()
    let userQuery = null

    User.onQuery((query) => (userQuery = query))
    const user = new User()
    user.username = 'virk'
    await user.save()
    await user.delete()

    assert.isTrue(user.$frozen)
    try {
      user.username = 'foo'
    } catch ({ message }) {
      assert.match(message, /^E_DELETED_MODEL: Cannot edit deleted model instance for User model/)
    }
    assert.equal(userQuery.sql, helpers.formatQuery('delete from "users" where "id" = ?'))
  })

  test('allow to unfreeze model instance', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    const user = new User()
    user.freeze()
    user.unfreeze()

    assert.isFalse(user.$frozen)
  })

  test('dates should be an empty array when createdAtColumn and updatedAtColumn is not defined', async (assert) => {
    class User extends Model {
      static get createdAtColumn () {
        return null
      }

      static get updatedAtColumn () {
        return null
      }
    }
    User._bootIfNotBooted()
    assert.deepEqual(User.dates, [])
  })

  test('do not populate dates when columns are set to null', async (assert) => {
    class User extends Model {
      static get createdAtColumn () {
        return null
      }

      static get updatedAtColumn () {
        return null
      }
    }
    User._bootIfNotBooted()
    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.equal(userQuery.sql, helpers.addReturningStatement(helpers.formatQuery('insert into "users" ("username") values (?)'), 'id'))
  })

  test('throw exception when onQuery doesn\'t recieves as callback', (assert) => {
    assert.plan(1)

    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    const fn = () => User.onQuery('foo')
    assert.throw(fn, 'E_INVALID_PARAMETER: Model.onQuery expects a closure as first parameter')
  })

  test('throw exception when addGlobalScope doesn\'t recieves as callback', (assert) => {
    assert.plan(1)

    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    const fn = () => User.addGlobalScope('foo')
    assert.throw(fn, 'E_INVALID_PARAMETER: Model.addGlobalScope expects a closure as first parameter')
  })

  test('refresh model state', async (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isUndefined(user.type)
    await user.reload()
    assert.equal(user.type, 'admin')
  })

  test('do not reload when isNew', async (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    assert.isUndefined(user.type)
    await user.reload()
    assert.isUndefined(user.type)
  })

  test('throw exception on reload when the row is missing', async (assert) => {
    assert.plan(2)
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isUndefined(user.type)

    await ioc.use('Database').table('users').truncate()
    try {
      await user.reload()
    } catch ({ message }) {
      assert.match(message, /^E_RUNTIME_ERROR: Cannot reload model since row with id 1 has been removed/)
    }
  })

  test('do not reload when model is deleted', async (assert) => {
    assert.plan(2)
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isUndefined(user.type)
    await user.delete()

    try {
      await user.reload()
    } catch ({ message }) {
      assert.match(message, /^E_RUNTIME_ERROR: Cannot reload a deleted model instance/)
    }
  })

  test('rollback save operation via transaction', async (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    const trx = await ioc.use('Database').beginTransaction()
    try {
      const user = new User()
      user.username = 'virk'
      await user.save(trx)
      trx.rollback()
    } catch (error) {
      trx.rollback()
      throw error
    }

    const count = await ioc.use('Database').table('users').count('* as total')
    assert.deepEqual(count, [{ 'total': helpers.formatNumber(0) }])
  })

  test('rollback update operation via transaction', async (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    const user = new User()
    user.username = 'virk'
    await user.save()

    const trx = await ioc.use('Database').beginTransaction()
    try {
      user.username = 'nikk'
      await user.save(trx)
      trx.rollback()
    } catch (error) {
      trx.rollback()
      throw error
    }

    const firtUser = await ioc.use('Database').table('users').first()
    assert.equal(firtUser.username, 'virk')
  })

  test('create inside a transaction', async (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()
    const trx = await ioc.use('Database').beginTransaction()

    try {
      await User.create({ username: 'virk' }, trx)
      trx.rollback()
    } catch (error) {
      trx.rollback()
      throw error
    }

    const count = await ioc.use('Database').table('users').count('* as total')
    assert.deepEqual(count, [{ 'total': helpers.formatNumber(0) }])
  })

  test('createMany inside a transaction', async (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()
    const trx = await ioc.use('Database').beginTransaction()

    try {
      await User.createMany([{ username: 'virk' }], trx)
      trx.rollback()
    } catch (error) {
      trx.rollback()
      throw error
    }

    const count = await ioc.use('Database').table('users').count('* as total')
    assert.deepEqual(count, [{ 'total': helpers.formatNumber(0) }])
  })

  test('define runtime visible fields', async (assert) => {
    class User extends Model {
      static get visible () {
        return ['created_at']
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.query().where('username', 'virk').setVisible(['created_at', 'id']).fetch()
    assert.deepEqual(Object.keys(users.first().toObject()), ['created_at', 'id'])
  })

  test('define after fetch hook', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    const fn = async function () {}
    User.addHook('afterFetch', fn)

    assert.deepEqual(User.$hooks.after._handlers.fetch, [{ handler: fn, name: undefined }])
  })

  test('call after fetch hook when fetching data', async (assert) => {
    assert.plan(2)
    class User extends Model {
    }

    User._bootIfNotBooted()

    const fn = async function (instances) {
      instances.forEach((instance) => {
        assert.instanceOf(instance, User)
      })
    }

    User.addHook('afterFetch', fn)
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await User.all()
  })

  test('create a new row when unable to find one', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    const count = await ioc.use('Database').table('users').count('* as total')
    assert.equal(count[0].total, 0)

    const user = await User.findOrCreate({ username: 'foo' })
    assert.isTrue(user.$persisted)
    assert.equal(user.username, 'foo')
  })

  test('create a new row when unable to find one using trx', async (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    const count = await ioc.use('Database').table('users').count('* as total')
    assert.equal(count[0].total, 0)

    const trx = await ioc.use('Database').beginTransaction()
    const user = await User.findOrCreate({ username: 'foo' }, { username: 'virk' }, trx)
    await trx.commit()

    assert.isTrue(user.$persisted)
    assert.equal(user.username, 'virk')
  })

  test('return existing row when found one', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    let usersQuery = null
    User.onQuery((query) => (usersQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'foo' })
    const user = await User.findOrCreate({ username: 'foo' })
    assert.isTrue(user.$persisted)
    assert.equal(user.username, 'foo')
    assert.equal(helpers.formatQuery(usersQuery.sql), helpers.formatQuery('select * from "users" where "username" = ? limit ?'))
  })

  test('return existing row when found one using trx', async (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
      }
    }

    User._bootIfNotBooted()

    let usersQuery = null
    User.onQuery((query) => (usersQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'foo' })

    const trx = await ioc.use('Database').beginTransaction()
    const user = await User.findOrCreate({ username: 'foo' }, { username: 'virk' }, trx)
    await trx.commit()

    assert.isTrue(user.$persisted)
    assert.equal(user.username, 'foo')
    assert.equal(helpers.formatQuery(usersQuery.sql), helpers.formatQuery('select * from "users" where "username" = ? limit ?'))
  })

  test('pass different payload for create', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    let usersQuery = null
    User.onQuery((query) => (usersQuery = query))

    const user = await User.findOrCreate({ username: 'foo' }, { username: 'foo', vid: 2 })
    assert.isTrue(user.$persisted)
    assert.equal(user.username, 'foo')
    assert.equal(user.vid, 2)
    assert.equal(helpers.formatQuery(usersQuery.sql), helpers.formatQuery(helpers.addReturningStatement('insert into "users" ("created_at", "updated_at", "username", "vid") values (?, ?, ?, ?)', 'id')))
  })

  test('new up a row when old doesn\'t exists', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    const user = await User.findOrNew({ username: 'foo' }, { username: 'foo', vid: 2 })
    assert.isFalse(user.$persisted)
    assert.equal(user.username, 'foo')
    assert.equal(user.vid, 2)
  })

  test('have access to id after save', async (assert) => {
    class User extends Model {}
    User._bootIfNotBooted()
    const user = new User()
    user.fill({ username: 'virk' })
    await user.save()
    assert.isDefined(user.id)
    assert.equal(user.id, 1)
    assert.equal(user.toJSON().id, 1)
  })

  test('should reflect new updated_at time', async (assert) => {
    class User extends Model {}
    User._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    const timeBeforeSave = user.updated_at
    await helpers.sleep(2000)

    user.username = 'simon'
    await user.save()
    assert.notEqual(timeBeforeSave, user.updated_at)
  }).timeout(6000)

  test('creating a new row should have timestamps', async (assert) => {
    class User extends Model {}
    User._bootIfNotBooted()

    const user = await User.create({ username: 'virk' })
    assert.isDefined(user.created_at)
    assert.isDefined(user.updated_at)
    assert.equal(user.created_at, user.toJSON().created_at)
    assert.equal(user.updated_at, user.toJSON().updated_at)
  })

  test('call after paginate hook when calling paginate method', async (assert) => {
    assert.plan(3)
    class User extends Model {
    }

    User._bootIfNotBooted()

    const fn = async function (instances, pages) {
      assert.deepEqual(pages, { perPage: 20, total: helpers.formatNumber(2), page: 1, lastPage: 1 })

      instances.forEach((instance) => {
        assert.instanceOf(instance, User)
      })
    }

    User.addHook('afterPaginate', fn)
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await User.query().paginate()
  })

  test('call castDate on a newly persisted model', async (assert) => {
    const casting = []

    class User extends Model {
      static castDates (field, value) {
        const formattedValue = value.format('YYYY')
        casting.push({ key: field, value: formattedValue })
        return formattedValue
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()
    const json = user.toJSON()

    assert.equal(json.created_at, new Date().getFullYear())
    assert.equal(json.updated_at, new Date().getFullYear())
    assert.deepEqual(casting.map((field) => field.key), ['created_at', 'updated_at'])
  })

  test('call query scopes when getCount is called', async (assert) => {
    let userQuery = null
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    User.onQuery(function (query) {
      userQuery = query
    })

    await User.query().where('username', 'virk').getCount()
    assert.equal(userQuery.sql, helpers.formatQuery('select count(*) as "__lucid_aggregate" from (select * from "users" where "username" = ? and "deleted_at" is null) as "__lucid"'))
  })

  test('call query scopes when count method is called', async (assert) => {
    let userQuery = null
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    User.onQuery(function (query) {
      userQuery = query
    })

    await User.query().where('username', 'virk').count('* as total')
    assert.equal(userQuery.sql, helpers.formatQuery('select count(*) as "total" from "users" where "username" = ? and "deleted_at" is null'))
  })

  test('call query scopes when min method is called', async (assert) => {
    let userQuery = null
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    User.onQuery(function (query) {
      userQuery = query
    })

    await User.query().where('username', 'virk').min('age')
    assert.equal(userQuery.sql, helpers.formatQuery('select min("age") from "users" where "username" = ? and "deleted_at" is null'))
  })

  test('calling ids should apply query scopes', async (assert) => {
    let userQuery = null
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    User.onQuery(function (query) {
      userQuery = query
    })

    await User.query().where('username', 'virk').ids()
    assert.equal(userQuery.sql, helpers.formatQuery('select "id" from "users" where "username" = ? and "deleted_at" is null'))
  })

  test('calling pairs should apply query scopes', async (assert) => {
    let userQuery = null
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    User.onQuery(function (query) {
      userQuery = query
    })

    await User.query().where('username', 'virk').pair('id', 'username')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "username" = ? and "deleted_at" is null'))
  })

  test('calling toString should apply query scopes', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    const userQuery = User.query().where('username', 'virk').toString()
    assert.equal(userQuery, helpers.formatQuery('select * from "users" where "username" = \'virk\' and "deleted_at" is null'))
  })

  test('calling paginate should apply query scopes on count call too', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    await User.create({ username: 'virk', deleted_at: new Date() })
    const result = await User.query().where('username', 'virk').paginate()

    assert.equal(result.pages.total, helpers.formatNumber(0))
    assert.deepEqual(result.rows, [])
  })

  test('where method closure should have access to query builder instance', async (assert) => {
    class User extends Model {
      static scopeAdult (builder) {
        builder.where('age', '>', 18)
      }
    }

    User._bootIfNotBooted()

    const queryBuilder = User.query()

    const query = queryBuilder.where(function (builder) {
      builder.adult()
    }).toSQL()

    assert.equal(query.sql, helpers.formatQuery('select * from "users" where ("age" > ?)'))
    assert.deepEqual(query.bindings, helpers.formatBindings([18]))
  })
})
