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
const _ = require('lodash')

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
  } else if (typeof (target.constructor.computed) === 'object' && Array.isArray(target.constructor.computed) && target.constructor.computed.indexOf(name) > -1) {
    /**
   * Check if name exists in computed properties
   * if it does then convert it to camelCase & call the getName($attributes) function
   */
    return target[_.camelCase('get_' + name)](target.$attributes)
  } else if (typeof (target.$attributes[name]) !== 'undefined' && typeof (target[_.camelCase('get_' + name)]) === 'function') {
    /**
     * Check if name exists in $attribute and function getName() exists
     * If it does then convert it to camelCase & call the getName(attributeValue) function
     */
    return target[_.camelCase('get_' + name)](target.$attributes[name])
  }
})
