'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const CE = require('../Exceptions')
const ModelFactory = require('./ModelFactory')

/**
 * Factory class is used to define blueprints
 * and then get model or database factory
 * instances to seed the database.
 *
 * @class Factory
 * @constructor
 */
class Factory {
  constructor () {
    this._blueprints = []
  }

  /**
   * Register a new blueprint with model or table name
   * and callback to be called for each new model
   * instance or insert query
   *
   * @method blueprint
   *
   * @param  {String}   name
   * @param  {Function} callback
   *
   * @chainable
   */
  blueprint (name, callback) {
    if (typeof (callback) !== 'function') {
      throw CE.InvalidArgumentException.invalidParameter('Factory.blueprint expects a callback as 2nd parameter')
    }
    this._blueprints.push({ name, callback })
    return this
  }

  /**
   * Returns the blueprint
   *
   * @method getBlueprint
   *
   * @param  {String}     name
   *
   * @return {Object}
   */
  getBlueprint (name) {
    return this._blueprints.find((blueprint) => blueprint.name === name)
  }

  /**
   * Get model factory for a registered blueprint
   *
   * @method model
   *
   * @param  {String} name
   *
   * @return {ModelFactory}
   */
  model (name) {
    const blueprint = this.getBlueprint(name)
    return new ModelFactory(blueprint.name, blueprint.callback)
  }

  /**
   * Clear all the registered blueprints
   *
   * @method clear
   *
   * @return {void}
   */
  clear () {
    this._blueprints = []
  }
}

module.exports = new Factory()
