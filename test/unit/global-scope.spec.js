'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const GlobalScope = require('../../src/Lucid/GlobalScope')

test.group('GlobalScope', () => {
  test('throw exception when callback is not a function', (assert) => {
    const globalScope = new GlobalScope()
    const fn = () => globalScope.add({})
    assert.throw(fn, 'E_INVALID_PARAMETER: Model.addGlobalScope expects a closure as first parameter instead received object')
  })

  test('throw exception when name is defined but not a string', (assert) => {
    const globalScope = new GlobalScope()
    const fn = () => globalScope.add(function () {}, {})
    assert.throw(fn, 'E_INVALID_PARAMETER: Model.addGlobalScope expects a string for the scope name instead received object')
  })

  test('add a new callback to the store', (assert) => {
    const fn = function () {}

    const globalScope = new GlobalScope()
    globalScope.add(fn)

    assert.deepEqual(globalScope.scopes, [{ callback: fn, name: null }])
  })

  test('add a new callback to the store with a unique name', (assert) => {
    const fn = function () {}

    const globalScope = new GlobalScope()
    globalScope.add(fn, 'foo')

    assert.deepEqual(globalScope.scopes, [{ callback: fn, name: 'foo' }])
  })

  test('throw exception when a global with same name exists', (assert) => {
    const globalScope = new GlobalScope()
    globalScope.add(function () {}, 'foo')
    const fn = () => globalScope.add(function () {}, 'foo')
    assert.throw(fn, 'E_RUNTIME_ERROR: A scope with name foo alredy exists. Give your scope a unique name')
  })

  test('do not throw exception when name is null for multiple scopes', (assert) => {
    const globalScope = new GlobalScope()
    globalScope.add(function () {})
    globalScope.add(function () {})
    assert.lengthOf(globalScope.scopes, 2)
  })

  test('return an instance of iterator to execute scopes', (assert) => {
    const globalScope = new GlobalScope()
    globalScope.add(function () {})
    const iterator = globalScope.iterator()
    assert.deepEqual(iterator._scopes, globalScope.scopes)
  })

  test('execute all scope callbacks', (assert) => {
    assert.plan(1)
    const builder = {}

    const globalScope = new GlobalScope()
    globalScope.add(function (__builder__) {
      assert.deepEqual(__builder__, builder)
    })

    const iterator = globalScope.iterator()
    iterator.execute(builder)
  })

  test('ignore all scopes when ignore method is called without any arguments', (assert) => {
    const builder = {}

    const globalScope = new GlobalScope()
    globalScope.add(function () {
      assert.throw('Never expected to be called')
    })

    const iterator = globalScope.iterator()
    iterator.ignore().execute(builder)
  })

  test('do not execute scopes more than once', (assert) => {
    assert.plan(1)
    const builder = {}

    const globalScope = new GlobalScope()
    globalScope.add(function (__builder__) {
      assert.deepEqual(__builder__, builder)
    })

    const iterator = globalScope.iterator()
    iterator.execute(builder)
    iterator.execute(builder)
  })

  test('ignore selected scopes by name', (assert) => {
    assert.plan(1)
    const builder = {}

    const globalScope = new GlobalScope()
    globalScope.add(function (__builder__) {
      assert.throw('Never exepcted to be called')
    }, 'foo')

    globalScope.add(function (__builder__) {
      assert.deepEqual(__builder__, builder)
    }, 'bar')

    const iterator = globalScope.iterator()
    iterator.ignore(['foo']).execute(builder)
  })

  test('throw exception when argument passed to ignore is not an array', (assert) => {
    assert.plan(1)

    const globalScope = new GlobalScope()
    const iterator = globalScope.iterator()
    const fn = () => iterator.ignore('foo')
    assert.throw(fn, 'E_INVALID_PARAMETER: ignoreScopes expects an array of names to ignore instead received string')
  })
})
