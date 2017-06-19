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
const EagerLoad = require('../../src/Lucid/EagerLoad')

test.group('EagerLoad', () => {
  test('parse relationship string', (assert) => {
    const eagerLoad = new EagerLoad({}, { posts: null })
    assert.deepEqual(eagerLoad._relations, { posts: { callback: null, nested: null } })
  })

  test('parse relationship string with callback', (assert) => {
    const fn = function () {}
    const eagerLoad = new EagerLoad({}, { posts: fn })
    assert.deepEqual(eagerLoad._relations, { posts: { callback: fn, nested: null } })
  })

  test('parse nested relationship string', (assert) => {
    const eagerLoad = new EagerLoad({}, { 'posts.comments': null })
    assert.deepEqual(eagerLoad._relations, { posts: { callback: null, nested: { comments: null } } })
  })

  test('parse nested relationship with callback', (assert) => {
    const fn = function () {}
    const eagerLoad = new EagerLoad({}, { 'posts.comments': fn })
    assert.deepEqual(eagerLoad._relations, { posts: { callback: null, nested: { comments: fn } } })
  })

  test('parse deeply nested relationship', (assert) => {
    const eagerLoad = new EagerLoad({}, { 'posts.comments.votes': null })
    assert.deepEqual(eagerLoad._relations, { posts: { callback: null, nested: { 'comments.votes': null } } })
  })

  test('parse deeply nested relationship with callback', (assert) => {
    const fn = function () {}
    const eagerLoad = new EagerLoad({}, { 'posts.comments.votes': fn })
    assert.deepEqual(eagerLoad._relations, { posts: { callback: null, nested: { 'comments.votes': fn } } })
  })

  test('parse multiple nested relations', (assert) => {
    const eagerLoad = new EagerLoad({}, { 'posts.comments': null, 'posts.likes' : null })
    assert.deepEqual(eagerLoad._relations, { posts: { callback: null, nested: { comments: null, likes: null  } } })
  })

  test('parse multiple nested relations with callback', (assert) => {
    const fn = function () {}
    const eagerLoad = new EagerLoad({}, { 'posts.comments': null, 'posts.likes' : null, posts: fn })
    assert.deepEqual(eagerLoad._relations, { posts: { callback: fn, nested: { comments: null, likes: null  } } })
  })
})
