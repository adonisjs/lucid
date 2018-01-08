'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const CE = require('../../Exceptions')
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
  if (target.isDeleted && name !== '$frozen') {
    throw CE.ModelException.deletedInstance(target.constructor.name)
  }

  if (target.__setters__.indexOf(name) > -1) {
    target[name] = value
    return true
  }

  target.set(name, value)
  return true
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
