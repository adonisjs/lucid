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
const util = require('../../../lib/util')

const methodsList = [
  'increment',
  'decrement',
  'sum',
  'sumDistinct',
  'avg',
  'avgDistinct',
  'min',
  'max',
  'count',
  'countDistinct',
  'getSum',
  'getSumDistinct',
  'getAvg',
  'getAvgDistinct',
  'getMin',
  'getMax',
  'getCount',
  'getCountDistinct',
  'truncate',
  'ids',
  'paginate',
  'pair',
  'pluckFirst',
  'pluckId',
  'pick',
  'pickInverse',
  'delete',
  'update',
  'first',
  'last',
  'firstOrFail',
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
    this.RelatedModel = RelatedModel
    this.primaryKey = primaryKey
    this.foreignKey = foreignKey
    this.relatedQuery = this.RelatedModel.query()

    /**
     * Storing relation meta-data on the
     * query builder.
     */
    this.relatedQuery.$relation = {
      name: this.constructor.name,
      foreignKey: this.foreignKey,
      primaryKey: this.primaryKey,
      primaryTable: this.$primaryTable,
      foreignTable: this.$foreignTable
    }

    /**
     * this is default value to eagerload data, but users
     * can pass their custom function by calling
     * `eagerLoadQuery` method and pass a
     * closure to it.
     *
     * @method _eagerLoadFn
     *
     * @param  {Object} query
     * @param  {String} fk
     * @param  {Array} rows
     *
     * @return {void}
     */
    this._eagerLoadFn = function (query, fk, values) {
      query.whereIn(`${this.RelatedModel.table}.${fk}`, values)
    }

    /**
     * This is set by `relatedWhere` method in case of a self
     * join
     *
     * @type {Number|Null}
     */
    this.relatedTableAlias = null

    return new Proxy(this, {
      get: proxyGet('relatedQuery')
    })
  }

  /**
   * Define a custom eagerload query.
   *
   * NOTE: Defining eagerload query leaves everything on you
   * to resolve the correct rows and they must be an array
   *
   * @method eagerLoadQuery
   *
   * @return {void}
   */
  eagerLoadQuery (fn) {
    this._eagerLoadFn = fn
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
    if (!util.existy(this.$primaryKeyValue) || !this.parentInstance.$persisted) {
      throw CE.RuntimeException.unSavedModel(this.parentInstance.constructor.name)
    }
  }

  /**
   * Applies scopes on the related query. This is used when
   * the related query is used as subquery.
   *
   * @method applyRelatedScopes
   */
  applyRelatedScopes () {
    this.relatedQuery._applyScopes()
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
    const mappedRows = this.mapValues(rows)
    if (!mappedRows || !mappedRows.length) {
      return this.group([])
    }
    this._eagerLoadFn(this.relatedQuery, this.foreignKey, mappedRows)
    const relatedInstances = await this.relatedQuery.fetch()
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

  /**
   * Columnize dot notated column name using the formatter
   *
   * @method columnize
   *
   * @param  {String}  column
   *
   * @return {String}
   */
  columnize (column) {
    return this.relatedQuery.formatter().columnize(column)
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
