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
const moment = require('moment')
const _ = require('lodash')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const CollectionSerializer = require('../../src/Lucid/Serializers/Collection')

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
      if (process.plaform !== 'win32' || error.code !== 'EBUSY') {
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
    user.username = 'nikk'
    await user.save()
    user.username = 'virk'
    await user.save()

    assert.lengthOf(queries, 3)
    assert.equal(queries[0].sql, helpers.addReturningStatement(
      helpers.formatQuery('insert into "users" ("created_at", "updated_at", "username") values (?, ?, ?)'),
      'id'
    ))
    assert.equal(queries[1].sql, helpers.formatQuery('update "users" set "updated_at" = ?, "username" = ?'))
    assert.deepEqual(queries[1].bindings[1], 'nikk')
    assert.equal(queries[2].sql, helpers.formatQuery('update "users" set "updated_at" = ?, "username" = ?'))
    assert.deepEqual(queries[2].bindings[1], 'virk')
    assert.deepEqual(user.dirty, {})
  })

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
    assert.instanceOf(users, CollectionSerializer)
  })

  test('cast all dates to moment objects after fetch', async (assert) => {
    class User extends Model {
    }
    User._bootIfNotBooted()
    const user = new User()
    user.username = 'virk'
    await user.save()

    const users = await User.query().fetch()
    assert.instanceOf(users.first().created_at, moment)
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
    assert.equal(userQuery.sql, helpers.formatQuery('update "users" set "updated_at" = ?, "username" = ?'))
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
    await ioc.use('Database').table('users').insert([{username: 'virk'}, { username: 'nikk' }])
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
    await ioc.use('Database').table('users').insert([{username: 'virk'}, { username: 'nikk' }])
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
    await ioc.use('Database').table('users').insert([{username: 'virk'}, { username: 'nikk' }])
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
    await ioc.use('Database').table('users').insert([{username: 'virk'}, { username: 'nikk' }])
    const users = await User.query().where('username', 'virk').fetch()
    assert.deepEqual(Object.keys(users.first().toObject()), ['id', 'vid', 'username', 'updated_at', 'login_at', 'deleted_at'])
  })

  test('apply all global scopes to the query builder', async (assert) => {
    class User extends Model {
    }
    User._bootIfNotBooted()
    User.addGlobalScope(function (builder) {
      builder.where('deleted_at', null)
    })

    const query = User.query().where('username', 'virk')._applyScopes().toSQL()
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

    const query = User.query().where('username', 'virk').ignoreScopes(['softDeletes'])._applyScopes().toSQL()
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
    User.addHook('afterFind', function () {
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
    assert.instanceOf(users, CollectionSerializer)
  })

  test('pick x number of rows from database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.pick(1)
    assert.instanceOf(users, CollectionSerializer)
    assert.equal(users.size(), 1)
    assert.equal(users.first().username, 'virk')
  })

  test('pick inverse x number of rows from database', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.pickInverse(1)
    assert.instanceOf(users, CollectionSerializer)
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
    assert.instanceOf(users, CollectionSerializer)
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
})
