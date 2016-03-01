'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it*/
const util = require('../../lib/util')
const _ = require('lodash')
const chai = require('chai')
const expect = chai.expect

describe('Utils', function () {
  it('should make plural table for a given model', function () {
    class Person {}
    const tableName = util.makeTableName(Person)
    expect(tableName).to.equal('people')
  })

  it('should convert CamelCase models table to underscore table names', function () {
    class LineItem {}
    const tableName = util.makeTableName(LineItem)
    expect(tableName).to.equal('line_items')
  })

  it('should convert proper plural names', function () {
    class Mouse {}
    const tableName = util.makeTableName(Mouse)
    expect(tableName).to.equal('mice')
  })

  it('should make model foriegn key', function () {
    class Mouse {}
    const foreignKey = util.makeForeignKey(Mouse)
    expect(foreignKey).to.equal('mouse_id')
  })

  it('should make model foriegn key to underscore when model name is CamelCase', function () {
    class LineItems {}
    const foreignKey = util.makeForeignKey(LineItems)
    expect(foreignKey).to.equal('line_item_id')
  })

  it('should make getter name for a given field', function () {
    const field = 'id'
    const idGetter = util.makeGetterName(field)
    expect(idGetter).to.equal('getId')
  })

  it('should make getter name for a given field with snake case name', function () {
    const field = 'user_name'
    const idGetter = util.makeGetterName(field)
    expect(idGetter).to.equal('getUserName')
  })

  it('should make getter name for a given field with dash case name', function () {
    const field = 'first-name'
    const idGetter = util.makeGetterName(field)
    expect(idGetter).to.equal('getFirstName')
  })

  it('should return offset to be used inside a query for a given page', function () {
    const offset = util.returnOffset(1, 20)
    expect(offset).to.equal(0)
    const pageNextOffset = util.returnOffset(2, 20)
    expect(pageNextOffset).to.equal(20)
    const pageThirdOffset = util.returnOffset(3, 20)
    expect(pageThirdOffset).to.equal(40)
    const pageLastOffset = util.returnOffset(100, 20)
    expect(pageLastOffset).to.equal(1980)
  })

  it('return a new array with values of defined key', function () {
    const original = [
      {
        username: 'foo',
        age: 22
      },
      {
        username: 'bar',
        age: 24
      }
    ]
    const transformed = util.mapValuesForAKey(original, 'username')
    expect(transformed).deep.equal(['foo', 'bar'])
  })

  it('should return error when page number is less than zero', function () {
    const fn = function () {
      return util.validatePage(0)
    }
    expect(fn).to.throw(/cannot paginate results for page less than 1/)
  })

  it('should return error when page number is not a number than zero', function () {
    const fn = function () {
      return util.validatePage('1')
    }
    expect(fn).to.throw(/page parameter is required to paginate results/)
  })

  it('should make paginate meta data when total results are zero', function () {
    const meta = util.makePaginateMeta(0, 1, 10)
    expect(meta).deep.equal({total: 0, perPage: 10, currentPage: 1, lastPage: 0, data: []})
  })

  it('should make paginate meta data when total results are more than zero', function () {
    const meta = util.makePaginateMeta(20, 1, 10)
    expect(meta).deep.equal({total: 20, perPage: 10, currentPage: 1, lastPage: 2, data: []})
  })

  it('should add a mixin to lodash isolated instance', function () {
    const foo = function () {}
    util.addMixin('foo', foo)
    expect(_.isFunction(_.foo)).to.equal(false)
    expect(_.isFunction(util.lodash().foo)).to.equal(true)
  })
})
