'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * always return up and down defination from target
 * object, even if it has not been defined
 * @type {Array}
 */
const mustImplement = ['up', 'down']

/**
 * schema method aliases
 * @type {Object}
 */
const aliases = {
  create: 'createTable',
  createIfNotExists: 'createTableIfNotExists',
  rename: 'renameTable',
  drop: 'dropTable',
  has: 'hasTable',
  dropIfExists: 'dropTableIfExists'
}

let proxyHandler = exports = module.exports = {}

/**
 * proxies target get calls and returns custom
 *
 * @method get
 *
 * @param  {Object} target
 * @param  {String} name
 * @return {Mixed}
 *
 * @public
 */
proxyHandler.get = function (target, name) {
  if (target[name] || mustImplement.indexOf(name) > -1) {
    return target[name]
  }

  return function (key, callback) {
    if (Object.keys(aliases).indexOf(name) > -1) {
      name = aliases[name]
    }

    /**
     * Trying to be more explicit here by adding the if clause
     * on the name instead of checking the existence on
     * callback and when key is a function but that will not
     * be clear that this custom behaviour is required for
     * this.db only.
     *
     * @example
     * this.db(function () {})
     *
     * @alternate-check
     * if (!callback && typeof (key) === 'function') {
     *   // not explicit
     * }
     */
    if (name === 'db') {
      callback = key
      key = null
    }
    target.actions.push({key, callback, action: name})
  }
}
