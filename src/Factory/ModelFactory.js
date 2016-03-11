'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const cf = require('co-functional')
const _ = require('lodash')
const Ioc = require('adonis-fold').Ioc
const faker = require('faker')

class ModelFactory {

  constructor (binding, callback) {
    this.binding = Ioc.use(binding)
    this.callback = callback
    this.instances = []
  }

  /**
   * makes instance of a given model
   *
   * @param  {Object}      values
   * @return {Object}
   *
   * @private
   */
  _makeInstance (values) {
    const Model = this.binding
    return new Model(values)
  }

  /**
   * calls blueprint and passed faker library
   * to it.
   *
   * @return {Object}
   *
   * @private
   */
  _callBlueprint () {
    return this.callback(faker)
  }

  /**
   * returns a model instace by calling the blueprint
   * and setting values on model instance
   *
   * @return {Object}
   *
   * @public
   */
  make () {
    return this._makeInstance(this._callBlueprint())
  }

  /**
   * creates rows inside the database by calling create
   * method on the given model
   *
   * @method create
   *
   * @param  {Number} rows
   * @return {Object}      reference to this
   *
   * @public
   */
  * create (rows) {
    const self = this
    const range = _.range(rows)
    this.instances = yield cf.mapSerial(function * () {
      return yield self.binding.create(self._callBlueprint())
    }, range)
    return this
  }

  /**
   * loops through all the created instances and
   * executes a callback with support for
   * calling generators
   *
   * @method each
   *
   * @param  {Function} callback
   *
   * @public
   */
  each (callback) {
    return cf.forEach(function * (instance) {
      yield callback(instance)
    }, this.instances)
  }

  /**
   * will reset the given model by calling
   * truncate method on it.
   *
   * @return {Number}
   *
   * @public
   */
  reset () {
    return this.binding.query().truncate()
  }

}

module.exports = ModelFactory
