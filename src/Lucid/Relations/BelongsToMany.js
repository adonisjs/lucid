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
const _ = require('lodash')
const helpers = require('../QueryBuilder/helpers')
const CatLog = require('cat-log')
const util = require('../../../lib/util')
const logger = new CatLog('adonis:lucid')

class BelongsToMany extends Relation {

  constructor (parent, related, pivotTable, pivotLocalKey, pivotOtherKey, primaryKey, relatedPrimaryKey) {
    super(parent, related)
    this.pivotPrefix = '_pivot_'
    this.pivotItems = []
    this._setUpPivotTable(pivotTable)
    this._setUpKeys(primaryKey, relatedPrimaryKey, pivotLocalKey, pivotOtherKey)
    this._decorateQueryBuilder()
  }

  /**
   * helper method to query the pivot table. One
   * can also do it manually by prefixing the
   * pivot table name.
   *
   * @private
   */
  _decorateQueryBuilder () {
    const self = this
    this.relatedQuery.wherePivot = function () {
      const args = _.toArray(arguments)
      args[0] = `${self.pivotTable}.${args[0]}`
      this.where.apply(this, args)
    }
  }

  /**
   * defines pivot table
   *
   * @param  {String}         pivotTable
   *
   * @private
   */
  _setUpPivotTable (pivotTable) {
    this.pivotTable = pivotTable || util.makePivotTableName(this.parent.constructor, this.related)
  }

  /**
   * defines keys to be used for resolving relationships
   *
   * @param  {String}   primaryKey
   * @param  {String}   relatedPrimaryKey
   * @param  {String}   pivotLocalKey
   * @param  {String}   pivotOtherKey
   *
   * @private
   */
  _setUpKeys (primaryKey, relatedPrimaryKey, pivotLocalKey, pivotOtherKey) {
    this.toKey = relatedPrimaryKey || this.related.primaryKey // comments -> id
    this.fromKey = primaryKey || this.parent.constructor.primaryKey // post -> id
    this.pivotLocalKey = pivotLocalKey || util.makePivotModelKey(this.parent.constructor) // post_id
    this.pivotOtherKey = pivotOtherKey || util.makePivotModelKey(this.related) // comment_id
  }

  /**
   * makes the join query to be used by other
   * methods.
   *
   * @public
   */
  _makeJoinQuery () {
    const self = this
    const selectionKeys = [
      `${this.related.table}.*`,
      `${this.pivotTable}.${this.pivotLocalKey} as ${this.pivotPrefix}${this.pivotLocalKey}`,
      `${this.pivotTable}.${this.pivotOtherKey} as ${this.pivotPrefix}${this.pivotOtherKey}`
    ]
    _.each(this.pivotItems, (item) => {
      selectionKeys.push(`${this.pivotTable}.${item} as ${this.pivotPrefix}${item}`)
    })

    this.relatedQuery
    .select.apply(this.relatedQuery, selectionKeys)
    .innerJoin(this.pivotTable, function () {
      this.on(`${self.related.table}.${self.toKey}`, `${self.pivotTable}.${self.pivotOtherKey}`)
    })
  }

  /**
   * decorates the current query chain before execution
   */
  _decorateRead () {
    this._makeJoinQuery()
    this.relatedQuery.where(`${this.pivotTable}.${this.pivotLocalKey}`, this.parent[this.fromKey])
  }

  /**
   * Returns a cloned query with the join statement to be
   * used for fetching aggregates or paginate results.
   *
   * @param   {String} expression
   *
   * @return  {Object}
   *
   * @private
   */
  _getAlternateQuery (expression) {
    const self = this
    const countByQuery = this.relatedQuery.clone()

    countByQuery.innerJoin(this.pivotTable, function () {
      this.on(`${self.related.table}.${self.toKey}`, `${self.pivotTable}.${self.pivotOtherKey}`)
    }).where(`${this.pivotTable}.${this.pivotLocalKey}`, this.parent[this.fromKey])

    return countByQuery
  }

  /**
   * paginates over a set of results based upon current page
   * and values to be fetched per page.
   *
   * @method paginate
   *
   * @param  {Number} page
   * @param  {Number} perPage
   *
   * @return {Array}
   */
  paginate (page, perPage) {
    this._validateRead()
    /**
     * creating the query clone to be used as countByQuery,
     * since selecting fields in countby requires unwanted
     * groupBy clauses.
     */
    const countByQuery = this._getAlternateQuery().count(`${this.pivotTable}.${this.pivotLocalKey} as total`)

    /**
     * It is important to decorate the actual query
     * builder after fetching the alternate query
     * since fresh query builder is required
     * to return alternate query
     */
    this._decorateRead()

    /**
     * calling the paginate method on proxies query builder
     * which optionally accepts a countByQuery
     */
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
    throw CE.ModelRelationException.unSupportedMethod('increment', 'BelongsToMany')
  }

  /**
   * Throws exception since update should be
   * done after getting the instance.
   */
  decrement () {
    throw CE.ModelRelationException.unSupportedMethod('decrement', 'BelongsToMany')
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} values
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
    const results = yield this.relatedQuery.whereIn(`${this.pivotTable}.${this.pivotLocalKey}`, values).fetch()
    return results.groupBy((item) => {
      return item[`${this.pivotPrefix}${this.pivotLocalKey}`]
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
    const results = yield this.relatedQuery.where(`${this.pivotTable}.${this.pivotLocalKey}`, value).fetch()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * attach method will add relationship to the pivot table
   * with current instance and related model values
   *
   * @param  {Array|Object} references
   * @param  {Object} [pivotValues]
   * @return {Number}
   *
   * @example
   * user.roles().attach([1,2])
   * user.roles().attach([1,2], {is_admin: true})
   * user.roles().attach({1: {is_admin: true}, 2: {is_admin: false} })
   *
   * @public
   */
  * attach (references, pivotValues) {
    pivotValues = pivotValues || {}

    if (!_.isArray(references) && !_.isObject(references)) {
      throw CE.InvalidArgumentException.invalidParameter('attach expects an array of values or a plain object')
    }

    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('attach', this.parent.constructor.name, this.related.name)
    }

    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to attach values with ${this.fromKey} as primaryKey, whose value is falsy`)
    }

    if (_.isArray(references)) {
      references = _.fromPairs(_.map(references, function (reference) {
        return [reference, pivotValues]
      }))
    }

    const values = _.map(references, (reference, value) => {
      let result = {}
      result[this.pivotOtherKey] = value
      result[this.pivotLocalKey] = this.parent[this.fromKey]
      result = _.merge(result, reference)
      return result
    })

    yield this.relatedQuery.queryBuilder.table(this.pivotTable).insert(values)
  }

  /**
   * removes the relationship stored inside a pivot table. If
   * references are not defined all relationships will be
   * deleted
   * @method detach
   * @param  {Array} [references]
   * @return {Number}
   *
   * @public
   */
  * detach (references) {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('detach', this.parent.constructor.name, this.related.name)
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to attach values with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    const query = this.relatedQuery.queryBuilder.table(this.pivotTable).where(`${this.pivotLocalKey}`, this.parent[this.fromKey])

    /**
     * if references have been passed, then only remove them
     */
    if (_.isArray(references)) {
      query.whereIn(`${this.pivotOtherKey}`, references)
    }
    return yield query.delete()
  }

  /**
   * shorthand for detach and then attach
   *
   * @param  {Array} [references]
   * @param  {Object} [pivotValues]
   * @return {Number}
   *
   * @public
   */
  * sync (references, pivotValues) {
    yield this.detach()
    return yield this.attach(references, pivotValues)
  }

  /**
   * saves the related model and creates the relationship
   * inside the pivot table.
   *
   * @param  {Object} relatedInstance
   * @return {Boolean}
   *
   * @public
   */
  * save (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw CE.ModelRelationException.relationMisMatch('save expects an instance of related model')
    }
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('save', this.parent.constructor.name, this.related.name)
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to save relationship from ${this.parent.constructor.name} model with ${this.fromKey} as primaryKey, whose value is falsy`)
    }

    const isSaved = yield relatedInstance.save()
    if (isSaved) {
      yield this.attach([relatedInstance[this.toKey]])
    }
    relatedInstance[`${this.pivotPrefix}${this.pivotLocalKey}`] = this.parent[this.fromKey]
    relatedInstance[`${this.pivotPrefix}${this.pivotOtherKey}`] = relatedInstance[this.toKey]
    return isSaved
  }

  /**
   * creates the related model instance and calls save on it
   *
   * @param  {Object} values
   * @return {Boolean}
   *
   * @public
   */
  * create (values) {
    const RelatedModel = this.related
    const relatedInstance = new RelatedModel(values)
    yield this.save(relatedInstance)
    return relatedInstance
  }

}

module.exports = BelongsToMany
