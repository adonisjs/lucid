'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('../../../lib/iocResolver')
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
  'delete',
  'update',
  'first',
  'fetch',
  'toSQL',
  'toString'
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
  constructor (parentInstance, RelatedModel, primaryKey, foreignKey) {
    this.parentInstance = parentInstance
    this.RelatedModel = typeof (RelatedModel) === 'string' ? ioc.use(RelatedModel) : RelatedModel
    this.primaryKey = primaryKey
    this.foreignKey = foreignKey
    this.relatedQuery = this.RelatedModel.query()
    return new Proxy(this, {
      get: proxyGet('relatedQuery')
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
   * @attribute $foreignTable
   *
   * @return {String}
   */
  get $foreignTable () {
    return this.RelatedModel.table
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

  /**
   * Returns the eagerLoad query for the relationship
   *
   * @method eagerLoad
   * @async
   *
   * @param  {Array}          rows
   *
   * @return {Object}
   */
  async eagerLoad (rows) {
    const relatedInstances = await this.relatedQuery.whereIn(this.foreignKey, this.mapValues(rows)).fetch()
    return this.group(relatedInstances.rows)
  }

  /**
   * Load a single relationship from parent to child
   * model, but only for one row.
   *
   * @method load
   * @async
   *
   * @param  {String|Number}     value
   *
   * @return {Model}
   */
  load () {
    return this.fetch()
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
