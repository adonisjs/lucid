'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Factory = exports = module.exports = {}
const ModelFactory = require('./ModelFactory')
const DatabaseFactory = require('./DatabaseFactory')
const CE = require('../Exceptions')
let blueprints = {}

/**
 * defines a new factory blueprint mapped on a given
 * key. Later callback is called and passed the
 * faker object.
 *
 * @method define
 *
 * @param  {String}   key
 * @param  {Function} callback
 *
 * @public
 */
Factory.blueprint = function (key, callback) {
  if (typeof (callback) !== 'function') {
    throw CE.InvalidArgumentException.invalidParameter('Factory blueprint expects callback to be a function')
  }
  blueprints[key] = callback
}

/**
 * returns all registered blueprints inside a factory
 * @method blueprints
 *
 * @return {Object}
 *
 * @public
 */
Factory.blueprints = function () {
  return blueprints
}

/**
 * clears all registered blueprints
 *
 * @method clear
 *
 * @public
 */
Factory.clear = function () {
  blueprints = {}
}

/**
 * resolves callback for a given key.
 *
 * @method _resolve
 *
 * @param  {String} key
 * @param {Function} callback
 *
 * @return {Function}
 *
 * @private
 */
Factory._resolve = function (key, callback) {
  const factoryClosure = blueprints[key]
  if (!factoryClosure) {
    callback()
    return
  }
  return factoryClosure
}

/**
 * returns instance of model factory and pass it
 * the blueprint defination.
 *
 * @method model
 *
 * @param  {String} key
 * @return {Object}
 *
 * @public
 */
Factory.model = function (key) {
  const factoryClosure = Factory._resolve(key, () => {
    throw CE.RuntimeException.modelFactoryNotFound(key)
  })
  return new ModelFactory(key, factoryClosure)
}

/**
 * returns instance of database factory and pass it
 * the blueprint defination.
 *
 * @method get
 *
 * @param  {String} key
 * @return {Object}
 *
 * @public
 */
Factory.get = function (key) {
  const factoryClosure = Factory._resolve(key, () => {
    throw CE.RuntimeException.databaseFactoryNotFound(key)
  })
  return new DatabaseFactory(key, factoryClosure)
}
