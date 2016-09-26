'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxyHandler = exports = module.exports = {}
const _ = require('lodash')
const queryExecMethods = [
  'increment',
  'decrement',
  'avg',
  'min',
  'max',
  'count',
  'truncate',
  'ids',
  'pair',
  'pluckFirst',
  'pluckId',
  'pick',
  'pickInverse'
]

proxyHandler.get = function (target, name) {
  /**
   * if value exists on the model instance, we return
   * it right away.
   */
  if (target[name] !== undefined) {
    return target[name]
  }

  if (name === 'withPivot') {
    return function () {
      target.pivotItems = _.concat(target.pivotItems, _.toArray(arguments))
      return this
    }
  }

  /**
   * Here we called methods on the relationships
   * to decorate the query chain by chain required
   * methods.
   */
  if (queryExecMethods.indexOf(name) > -1) {
    target._validateRead()
    target._decorateRead()
  }

  return target.relatedQuery[name]
}
