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
const RelationsParser = require('../../src/Lucid/Relations/Parser')

test.group('Relations Parser', () => {
  test('parse individual relationship string', (assert) => {
    const parsed = RelationsParser.parseRelation('posts')
    assert.deepEqual(parsed, { name: 'posts', nested: null, callback: null })
  })

  test('parse relationship string with callback', (assert) => {
    const fn = function () {}
    const parsed = RelationsParser.parseRelation('posts', fn)
    assert.deepEqual(parsed, { name: 'posts', nested: null, callback: fn })
  })

  test('parse nested relationship string', (assert) => {
    const parsed = RelationsParser.parseRelation('posts.comments')
    assert.deepEqual(parsed, { name: 'posts', nested: { comments: null }, callback: null })
  })

  test('parse nested relationship with callback', (assert) => {
    const fn = function () {}
    const parsed = RelationsParser.parseRelation('posts.comments', fn)
    assert.deepEqual(parsed, { name: 'posts', nested: { comments: fn }, callback: null })
  })

  test('parse deeply nested relationship', (assert) => {
    const parsed = RelationsParser.parseRelation('posts.comments.votes')
    assert.deepEqual(parsed, { name: 'posts', nested: { 'comments.votes': null }, callback: null })
  })

  test('parse deeply nested relationship with callback', (assert) => {
    const fn = function () {}
    const parsed = RelationsParser.parseRelation('posts.comments.votes', fn)
    assert.deepEqual(parsed, { name: 'posts', nested: { 'comments.votes': fn }, callback: null })
  })

  test('parse multiple nested relations', (assert) => {
    const parsed = RelationsParser.parseRelations({ 'posts.comments': null, 'posts.likes': null })
    assert.deepEqual(parsed, { posts: { name: 'posts', callback: null, nested: { comments: null, likes: null } } })
  })

  test('parse multiple nested relations when first relation doesn\t have nesting', (assert) => {
    const parsed = RelationsParser.parseRelations({ 'posts': null, 'posts.comments': null, 'posts.likes': null })
    assert.deepEqual(parsed, { posts: { name: 'posts', callback: null, nested: { comments: null, likes: null } } })
  })

  test('parse multiple nested relations with callback', (assert) => {
    const fn = function () {}
    const parsed = RelationsParser.parseRelations({ 'posts.comments': null, 'posts.likes': null, posts: fn })
    assert.deepEqual(parsed, { posts: { name: 'posts', callback: fn, nested: { comments: null, likes: null } } })
  })
})
