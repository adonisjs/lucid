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
const { ioc } = require('@adonisjs/fold')
const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const QueryBuilder = require('../../src/Lucid/QueryBuilder')

test.group('Traits', (group) => {
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

  test('pass settings to trait via ioc container', (assert) => {
    class FooTrait {
      register (ctx, settings) {
        assert.deepEqual(ctx, User)
        assert.deepEqual(settings, {foo: 1})
      }
    }

    ioc.fake('FooTrait', () => {
      return new FooTrait()
    })

    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait('@provider:FooTrait', {foo: 1})
      }
    }

    User._bootIfNotBooted()
  })

  test('pass settings to bound function', (assert) => {
    class User extends Model {
      static boot () {
        super.boot()
        this.addTrait((ctx, settings) => {
          assert.deepEqual(ctx, User)
          assert.deepEqual(settings, {foo: 1})
        }, {foo: 1})
      }
    }

    User._bootIfNotBooted()
  })
})
