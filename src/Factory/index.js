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
const NE = require('node-exceptions')
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
    throw new NE.InvalidArgumentException('callback should be a function while define a factory blueprint')
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
 * @return {Function}
 *
 * @private
 */
Factory._resolve = function (key) {
  const callback = blueprints[key]
  if (!callback) {
    throw new NE.RuntimeException(`Cannot find ${key} factory`)
  }
  return callback
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
  return new ModelFactory(key, Factory._resolve(key))
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
  return new DatabaseFactory(key, Factory._resolve(key))
}
