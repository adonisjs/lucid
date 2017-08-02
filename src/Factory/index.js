'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const GE = require('@adonisjs/generic-exceptions')
const ModelFactory = require('./ModelFactory')
const DatabaseFactory = require('./DatabaseFactory')

/**
 * Factory class is used to define blueprints
 * and then get model or database factory
 * instances to seed the database.
 *
 * @binding Adonis/Src/Factory
 * @singleton
 * @alias Factory
 * @group Database
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
   * and callback to be called to return the fake data
   * for model instance of table insert query.
   *
   * @method blueprint
   *
   * @param  {String}   name
   * @param  {Function} callback
   *
   * @chainable
   *
   * @example
   * ```js
   * Factory.blueprint('App/Model/User', (fake) => {
   *   return {
   *     username: fake.username(),
   *     password: async () => {
   *       return await Hash.make('secret')
   *     }
   *   }
   * })
   * ```
   */
  blueprint (name, callback) {
    if (typeof (callback) !== 'function') {
      throw GE
        .InvalidArgumentException
        .invalidParameter('Factory.blueprint expects a callback as 2nd parameter', callback)
    }
    this._blueprints.push({ name, callback })
    return this
  }

  /**
   * Returns the blueprint map with the map
   * and the callback.
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
   * Get model factory for a registered blueprint.
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
   * Get database factory instance for a registered blueprint
   *
   * @method get
   *
   * @param  {String} name
   *
   * @return {DatabaseFactory}
   */
  get (name) {
    const blueprint = this.getBlueprint(name)
    return new DatabaseFactory(blueprint.name, blueprint.callback)
  }

  /**
   * Clear all the registered blueprints.
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
