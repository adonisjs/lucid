'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxyGet = require('../../../lib/proxyGet')

const proxyHandler = exports = module.exports = {}

/**
 * Setter for proxy object
 *
 * @method set
 *
 * @param  {Object} target
 * @param  {String} name
 * @param  {Mixed} value
 */
proxyHandler.set = function (target, name, value) {
  if (target.__setters__.indexOf(name) > -1) {
    return target[name] = value
  }
  return target.set(name, value)
}

/**
 * Getter for proxy handler
 *
 * @method
 *
 * @param  {Object} target
 * @param  {String} name
 */
proxyHandler.get = proxyGet('$attributes', false, function (target, name) {
  if (typeof (target.$sideLoaded[name]) !== 'undefined') {
    return target.$sideLoaded[name]
  }
})
