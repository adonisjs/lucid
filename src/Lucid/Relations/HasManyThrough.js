'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Relation = require('./Relation')
const CE = require('../../Exceptions')
const helpers = require('../QueryBuilder/helpers')

class HasManyThrough extends Relation {

  constructor (parent, related, through, primaryKey, foreignKey, throughPrimaryKey, throughForeignKey) {
    super(parent, related)
    this.through = this._resolveModel(through)
    this.fromKey = primaryKey || this.parent.constructor.primaryKey // id
    this.toKey = foreignKey || this.parent.constructor.foreignKey // country_id
    this.viaKey = throughPrimaryKey || this.through.primaryKey // authors.id
    this.viaForeignKey = throughForeignKey || this.through.foreignKey // author_id
  }

  /**
   * makes join query to be used by select methods
   *
   * @private
   */
  _makeJoinQuery () {
    var self = this
    const selectionKeys = [`${this.related.table}.*`, `${this.through.table}.${this.toKey}`]
    this.relatedQuery
    .select.apply(this.relatedQuery, selectionKeys)
    .innerJoin(`${this.through.table}`, function () {
      this.on(`${self.through.table}.${self.viaKey}`, `${self.related.table}.${self.viaForeignKey}`)
    })
  }

  /**
   * decorates the current query chain before execution
   */
  _decorateRead () {
    this._makeJoinQuery()
    this.relatedQuery.where(`${this.through.table}.${this.toKey}`, this.parent[this.fromKey])
  }

  _getAlternateQuery () {
    const self = this
    const queryClone = this.relatedQuery.clone()

    queryClone
    .innerJoin(`${this.through.table}`, function () {
      this.on(`${self.through.table}.${self.viaKey}`, `${self.related.table}.${self.viaForeignKey}`)
    })
    .where(`${this.through.table}.${this.toKey}`, this.parent[this.fromKey])

    return queryClone
  }

  /**
   * Paginates over the related rows
   *
   * @param  {Number} page
   * @param  {Number} [perPage=20]
   *
   * @return {Object}
   */
  paginate (page, perPage) {
    this._validateRead()
    /**
     * creating the query clone to be used as countByQuery,
     * since selecting fields in countby requires unwanted
     * groupBy clauses.
     */
    const countByQuery = this._getAlternateQuery().count(`${this.through.table}.${this.toKey} as total`)

    this._decorateRead()
    return this.relatedQuery.paginate(page, perPage, countByQuery)
  }

  /**
   * Returns count of rows for the related row
   *
   * @param  {String} expression
   *
   * @return {Array}
   */
  count (expression) {
    this._validateRead()
    return this._getAlternateQuery().count(expression)
  }

  /**
   * Returns avg for a given column
   *
   * @param  {String} column
   *
   * @return {Array}
   */
  avg (column) {
    this._validateRead()
    return this._getAlternateQuery().avg(column)
  }

  /**
   * Return min value for a column
   *
   * @param  {String} column
   *
   * @return {Array}
   */
  min (column) {
    this._validateRead()
    return this._getAlternateQuery().min(column)
  }

  /**
   * Return max value for a column
   *
   * @param  {String} column
   *
   * @return {Array}
   */
  max (column) {
    this._validateRead()
    return this._getAlternateQuery().max(column)
  }

  /**
   * Throws exception since update should be
   * done after getting the instance.
   */
  increment () {
    throw CE.ModelRelationException.unSupportedMethod('increment', 'HasManyThrough')
  }

  /**
   * Throws exception since update should be
   * done after getting the instance.
   */
  decrement () {
    throw CE.ModelRelationException.unSupportedMethod('decrement', 'HasManyThrough')
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} values
   * @param {Function} [scopeMethod] [description]
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoad (values, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    this._makeJoinQuery()
    const results = yield this.relatedQuery.whereIn(`${this.through.table}.${this.toKey}`, values).fetch()
    return results.groupBy((item) => {
      return item[`${this.toKey}`]
    }).mapValues(function (value) {
      return helpers.toCollection(value)
    })
    .value()
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key. It is equivalent to eagerLoad but query defination
   * is little different.
   *
   * @param  {Mixed} value
   * @param {Function} [scopeMethod] [description]
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoadSingle (value, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    this._makeJoinQuery()
    const results = yield this.relatedQuery.where(`${this.through.table}.${this.toKey}`, value).fetch()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * Throws exception since save should be
   * done after getting the instance.
   */
  * save () {
    throw CE.ModelRelationException.unSupportedMethod('save', this.constructor.name)
  }

  /**
   * Throws exception since create should be
   * done after getting the instance.
   */
  * create () {
    throw CE.ModelRelationException.unSupportedMethod('create', this.constructor.name)
  }

  /**
   * Throws exception since createMany should be
   * done after getting the instance.
   */
  * createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', this.constructor.name)
  }

  /**
   * Throws exception since saveMany should be
   * done after getting the instance.
   */
  * saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', this.constructor.name)
  }

}

module.exports = HasManyThrough
