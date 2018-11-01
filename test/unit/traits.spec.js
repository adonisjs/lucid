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
const { Config, setupResolver } = require('@adonisjs/sink')
const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const QueryBuilder = require('../../src/Lucid/QueryBuilder')

test.group('Traits', (group) => {
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

  group.beforeEach(() => {
    ioc.restore()
  })

  test('throw exception when addTrait doesn\'t receives a callback or a string', (assert) => {
    assert.plan(1)

    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait({})
      }
    }

    const fn = () => User._bootIfNotBooted()
    assert.throw(fn, 'E_INVALID_PARAMETER: Model.addTrait expects an IoC container binding or a closure')
  })

  test('add a trait to the model', (assert) => {
    assert.plan(1)

    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait((ctx) => {
          assert.deepEqual(ctx, User)
        })
      }
    }

    User._bootIfNotBooted()
  })

  test('trait should be called only once', (assert) => {
    assert.plan(1)

    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait((ctx) => {
          assert.deepEqual(ctx, User)
        })
      }
    }

    User._bootIfNotBooted()
    User._bootIfNotBooted()
  })

  test('bind trait via ioc container', (assert) => {
    assert.plan(1)

    class FooTrait {
      register (ctx) {
        assert.deepEqual(ctx, User)
      }
    }

    ioc.fake('FooTrait', () => {
      return new FooTrait()
    })

    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait('@provider:FooTrait')
      }
    }

    User._bootIfNotBooted()
  })

  test('bind from a specific dir', (assert) => {
    assert.plan(1)

    class FooTrait {
      register (ctx) {
        assert.deepEqual(ctx, User)
      }
    }

    ioc.fake('App/Models/Traits/FooTrait', () => {
      return new FooTrait()
    })

    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait('FooTrait')
      }
    }

    User._bootIfNotBooted()
  })

  test('define traits as an array on model', (assert) => {
    assert.plan(1)

    class FooTrait {
      register (ctx) {
        assert.deepEqual(ctx, User)
      }
    }

    ioc.fake('App/Models/Traits/FooTrait', () => {
      return new FooTrait()
    })

    class User extends Model {
      static get traits () {
        return ['FooTrait']
      }
    }

    User._bootIfNotBooted()
  })

  test('define methods on query builder', (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait((ctx) => {
          ctx.queryMacro('search', function (name, value) {
            return this.where(name, value)
          })
        })
      }
    }

    User._bootIfNotBooted()

    const userQuery = User.query().search('username', 'virk').toSQL()
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "username" = ?'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings(['virk']))
  })

  test('model should not have an isolated copy of query builder unless queryMacro is defined', (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait(function () {})
      }
    }

    User._bootIfNotBooted()
    assert.isNull(User.QueryBuilder)
  })

  test('adding queryMacro to one model should not effect other models', (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait(function (ctx) {
          ctx.queryMacro('foo', function () {})
        })
      }
    }

    class Profile extends Model {}

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    assert.isFunction(User.QueryBuilder.prototype.foo)
    assert.isUndefined(QueryBuilder.prototype.foo)
  })

  test('should be able to define isolated query macros for all the models', (assert) => {
    const stack = []

    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait(function (ctx) {
          ctx.queryMacro('foo', function () {
            stack.push('on user')
          })
        })
      }
    }

    class Profile extends Model {
      static boot () {
        super.boot()
        this.addTrait(function (ctx) {
          ctx.queryMacro('foo', function () {
            stack.push('on profile')
          })
        })
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    User.query().foo()
    Profile.query().foo()

    assert.deepEqual(stack, ['on user', 'on profile'])
  })

  test('pass options to trait via ioc container', (assert) => {
    class FooTrait {
      register (ctx, options) {
        assert.deepEqual(ctx, User)
        assert.deepEqual(options, { foo: 1 })
      }
    }

    ioc.fake('FooTrait', () => {
      return new FooTrait()
    })

    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait('@provider:FooTrait', { foo: 1 })
      }
    }

    User._bootIfNotBooted()
  })

  test('pass options to bound function', (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait((ctx, options) => {
          assert.deepEqual(ctx, User)
          assert.deepEqual(options, { foo: 1 })
        }, { foo: 1 })
      }
    }

    User._bootIfNotBooted()
  })
})
