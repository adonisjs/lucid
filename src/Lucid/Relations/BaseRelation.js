'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('@adonisjs/fold')
const CE = require('../../Exceptions')
const proxyGet = require('../../../lib/proxyGet')

const methodsList = [
  'increment',
  'decrement',
  'avg',
  'min',
  'max',
  'count',
  'truncate',
  'ids',
  'pair',
  'pluckFirst',
  'pluckId',
  'pick',
  'pickInverse',
  'update',
  'first',
  'fetch'
]

/**
 * Base relation is supposed to be extended by other
 * relations. It takes care of commonly required
 * stuff.
 *
 * @class BaseRelation
 * @constructor
 */
class BaseRelation {
  constructor (parentInstance, relatedModel, primaryKey, foreignKey) {
    this.parentInstance = parentInstance
    this.relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel
    this.primaryKey = primaryKey
    this.foreignKey = foreignKey
    this.relatedQuery = this.relatedModel.query()
    return new Proxy(this, {
      get: proxyGet('relatedQuery', false)
    })
  }

  /**
   * Returns the value for the primary key set on
   * the relationship
   *
   * @attribute $primaryKeyValue
   *
   * @return {Mixed}
   */
  get $primaryKeyValue () {
    return this.parentInstance[this.primaryKey]
  }

  /**
   * The primary table in relationship
   *
   * @attribute $primaryTable
   *
   * @return {String}
   */
  get $primaryTable () {
    return this.parentInstance.constructor.table
  }

  /**
   * The foreign table in relationship
   *
   * @attribute $foriegnTable
   *
   * @return {String}
   */
  get $foriegnTable () {
    return this.relatedModel.table
  }

  /**
   * Decorates the query instance with the required where
   * clause. This method should be called internally by
   * all read/update methods.
   *
   * @method _decorateQuery
   *
   * @return {void}
   *
   * @private
   */
  _decorateQuery () {
    this.relatedQuery.where(this.foreignKey, this.$primaryKeyValue)
  }

  /**
   * Validates the read operation
   *
   * @method _validateRead
   *
   * @return {void}
   *
   * @throws {RuntimeException} If parent model is not persisted
   *
   * @private
   */
  _validateRead () {
    if (!this.$primaryKeyValue || !this.parentInstance.$persisted) {
      throw CE.RuntimeException.unSavedModel(this.parentInstance.constructor.name)
    }
  }
}

methodsList.forEach((method) => {
  BaseRelation.prototype[method] = function (...args) {
    this._validateRead()
    this._decorateQuery()
    return this.relatedQuery[method](...args)
  }
})

module.exports = BaseRelation
