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
const Hooks = require('../../src/Lucid/Hooks')
const helpers = require('./helpers')
const { ioc } = require('@adonisjs/fold')
const { setupResolver } = require('@adonisjs/sink')

test.group('Hooks', (group) => {
  group.before(() => {
    setupResolver()
  })

  group.beforeEach(() => {
    ioc.restore()
  })

  test('it should add handler for a hook', (assert) => {
    const hooks = new Hooks()
    const fn = function () {}
    hooks.addHandler('create', fn)
    assert.deepEqual(hooks._handlers, { create: [{ handler: fn, name: undefined }] })
  })

  test('it should add named handler for a hook', (assert) => {
    const hooks = new Hooks()
    const fn = function () {}
    hooks.addHandler('create', fn, 'hashPassword')
    assert.deepEqual(hooks._handlers, { create: [{ handler: fn, name: 'hashPassword' }] })
  })

  test('it should remove a named handler', (assert) => {
    const hooks = new Hooks()
    const fn = function () {}
    hooks.addHandler('create', fn, 'hashPassword')
    hooks.addHandler('create', fn, 'doSomething')
    assert.deepEqual(hooks._handlers, {
      create: [{ handler: fn, name: 'hashPassword' }, { handler: fn, name: 'doSomething' }]
    })

    hooks.removeHandler('create', 'doSomething')
    assert.deepEqual(hooks._handlers, { create: [{ handler: fn, name: 'hashPassword' }] })
  })

  test('throw exception when trying to remove without name', (assert) => {
    const hooks = new Hooks()
    hooks.addHandler('create', function () {}, 'hashPassword')
    const fn = () => hooks.removeHandler('create')
    assert.throw(fn, 'E_MISSING_PARAMETER: Missing parameter name expected by Hook.removeHandler as 2nd parameter')
  })

  test('it should remove all handlers', (assert) => {
    const hooks = new Hooks()
    const fn = function () {}
    hooks.addHandler('create', fn, 'hashPassword')
    hooks.addHandler('create', fn, 'doSomething')
    assert.deepEqual(hooks._handlers, {
      create: [{ handler: fn, name: 'hashPassword' }, { handler: fn, name: 'doSomething' }]
    })

    hooks.removeAllHandlers('create')
    assert.deepEqual(hooks._handlers, { create: [] })
  })

  test('do not create empty array if there were no handlers ever', (assert) => {
    const hooks = new Hooks()
    hooks.removeAllHandlers('create')
    assert.deepEqual(hooks._handlers, {})
  })

  test('execute plain functions in sequence', async (assert) => {
    const hooks = new Hooks()
    const stack = []

    hooks.addHandler('create', function () {
      stack.push(1)
    })

    hooks.addHandler('create', function () {
      stack.push(2)
    })

    await hooks.exec('create')
    assert.deepEqual(stack, [1, 2])
  })

  test('execute async hooks in sequence', async (assert) => {
    const hooks = new Hooks()
    const stack = []

    hooks.addHandler('create', async function () {
      await helpers.sleep(200)
      stack.push(1)
    })

    hooks.addHandler('create', async function () {
      stack.push(2)
    })

    await hooks.exec('create')
    assert.deepEqual(stack, [1, 2])
  })

  test('abort execution when an handler throws an exception', async (assert) => {
    assert.plan(2)
    const hooks = new Hooks()
    const stack = []

    hooks.addHandler('create', async function () {
      await helpers.sleep(200)
      stack.push(1)
    })

    hooks.addHandler('create', async function () {
      throw new Error('Stop')
    })

    hooks.addHandler('create', async function () {
      stack.push(2)
    })

    try {
      await hooks.exec('create')
    } catch ({ message }) {
      assert.equal(message, 'Stop')
      assert.deepEqual(stack, [1])
    }
  })

  test('execute alias handlers', async (assert) => {
    const hooks = new Hooks()
    const stack = []

    hooks.addHandler('save', async function () {
      stack.push(1)
    })

    hooks.addHandler('create', async function () {
      stack.push(2)
    })

    hooks.addHandler('create', async function () {
      stack.push(3)
    })

    await hooks.exec('create')
    assert.deepEqual(stack, [2, 3, 1])
  })

  test('define hook handler as a binding', async (assert) => {
    const hooks = new Hooks()
    const stack = []

    ioc.fake('Foo', () => {
      return {
        bar () {
          stack.push(1)
        }
      }
    })

    hooks.addHandler('save', '@provider:Foo.bar')
    await hooks.exec('create')
    assert.deepEqual(stack, [1])
  })

  test('auto pic hook from pre-defined directory', async (assert) => {
    const hooks = new Hooks()
    const stack = []

    ioc.fake('App/Models/Hooks/Foo', () => {
      return {
        bar () {
          stack.push(1)
        }
      }
    })

    hooks.addHandler('save', 'Foo.bar')
    await hooks.exec('create')
    assert.deepEqual(stack, [1])
  })

  test('hook class should have access to this', async (assert) => {
    assert.plan(1)
    const hooks = new Hooks()

    class Foo {
      bar () {
        assert.instanceOf(this, Foo)
      }
    }

    ioc.fake('App/Models/Hooks/Foo', () => {
      return new Foo()
    })

    hooks.addHandler('save', 'Foo.bar')
    await hooks.exec('create')
  })
})
