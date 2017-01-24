'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const helpers = exports = module.exports = {}
const util = require('../../../lib/util')

/**
 * this method override the original lodash toJSON method
 * as it will also call toJSON to child model instances
 * inside the final collection array.
 *
 * @method toJSON
 *
 * @param  {Object} values
 * @return {Object}
 *
 * @public
 */
const toJSON = function (values) {
  return util.lodash().transform(values, (result, value, index) => {
    result[index] = value.toJSON()
  })
}

/**
 * here we replace lodash toJSON with a custom implementation,
 * as we need to call to JSON to model instance too.
 */
util.addMixin('toJSON', toJSON, {chain: false})

/**
 * async version of serializer
 *
 * @method toJSONAsync
 *
 * @param  {Object} values
 * @return Promise
 *
 * @public
 */
const toJSONAsync = function (values) {
  return Promise.all(util.lodash().map(values, (value) => {
    return value.toJSONAsync()
  }))
}

util.addMixin('toJSONAsync', toJSONAsync, {chain: false})

/**
 * looks for dynamic scope method on model defination
 *
 * @method getScopeMethod
 *
 * @param  {Object}       target
 * @param  {String}       method
 * @return {Function|Null}
 *
 * @public
 */
helpers.getScopeMethod = function (target, method) {
  const scopedName = util.makeScopeMethodName(method)
  return target[scopedName] || null
}

helpers.toCollection = util.toCollection
