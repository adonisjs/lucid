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

proxyHandler.get = function (target, name) {
  if (target[name]) {
    return target[name]
  }
  if (name === 'withPivot') {
    return function () {
      target.pivotItems.push(_.toArray(arguments))
      return this
    }
  }
  return target.relatedQuery[name]
}
