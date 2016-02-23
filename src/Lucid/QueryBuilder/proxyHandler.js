'use strict'

/**
 * adonis-framework
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxyHandler = exports = module.exports = {}
const methods = require('./methods')

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
  if (target[name]) {
    return target[name]
  }
  if (methods[name]) {
    return methods[name](target)
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
  if (name === 'avoidTrashed') {
    target[name] = value
    return
  }
  target.modelQueryBuilder[name] = value
}
