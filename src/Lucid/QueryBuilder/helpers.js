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
