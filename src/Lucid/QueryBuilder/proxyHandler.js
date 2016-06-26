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
const methods = require('./methods')
const helpers = require('./helpers')
const _ = require('lodash')
const notToTouch = ['avoidTrashed']

/**
 * proxy handler for getting target properties.
 *
 * @method get
 *
 * @param  {Object} target
 * @param  {String} name
 * @return {Mixed}
 *
 * @private
 */
proxyHandler.get = function (target, name) {
  if (target[name] !== undefined) {
    return target[name]
  }

  if (methods[name]) {
    return methods[name](target)
  }
  /**
   * here we try to make a dynamic scope method on query
   * builder and if found, we will return that method
   */
  const scopeMethod = helpers.getScopeMethod(target.HostModel, name)
  if (scopeMethod) {
    return function () {
      const args = [target.modelQueryBuilder].concat(_.toArray(arguments))
      scopeMethod.apply(target.HostModel, args)
      return this
    }
  }
  return target.modelQueryBuilder[name]
}

/**
 * proxies all setter calls on a target object
 * and makes the decision on where to write
 * the value.
 *
 * @method set
 *
 * @param  {Object} target
 * @param  {String} name
 * @param  {Mixed} value
 *
 * @private
 */
proxyHandler.set = function (target, name, value) {
  if (notToTouch.indexOf(name) > -1) {
    target[name] = value
    return true
  }
  target.modelQueryBuilder[name] = value
  return true
}
