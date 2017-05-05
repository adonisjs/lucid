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
    this.pivotTimestamps = false
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
      return this
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
   * @param {Boolean} ignoreSelect
   *
   * @public
   */
  _makeJoinQuery (ignoreSelect) {
    const self = this
    const selectionKeys = [
      `${this.related.table}.*`,
      `${this.pivotTable}.${this.pivotLocalKey} as ${this.pivotPrefix}${this.pivotLocalKey}`,
      `${this.pivotTable}.${this.pivotOtherKey} as ${this.pivotPrefix}${this.pivotOtherKey}`
    ]
    _.each(this.pivotItems, (item) => {
      selectionKeys.push(`${this.pivotTable}.${item} as ${this.pivotPrefix}${item}`)
    })

    if (!ignoreSelect) {
      this.relatedQuery.select.apply(this.relatedQuery, selectionKeys)
    }

    this.relatedQuery.innerJoin(this.pivotTable, function () {
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
   * Returns an object of keys and values of timestamps to be
   * set on pivot table. All values/keys are derived from
   * the parent model. Also if parent model disables
   * timestamps, the withTimestamps function will
   * have no effect.
   *
   * @return  {Object}
   * @private
   */
  _getTimestampsForPivotTable () {
    const timestamps = {}
    if (this.pivotTimestamps) {
      this.parent.setCreateTimestamp(timestamps)
      this.parent.setUpdateTimestamp(timestamps)
    }
    return timestamps
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
   * Returns the existence query to be used when main
   * query is dependent upon childs.
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  exists (callback) {
    this._makeJoinQuery(true)
    this.relatedQuery.whereRaw(`${this.pivotTable}.${this.pivotLocalKey} = ${this.parent.constructor.table}.${this.fromKey}`)
    if (typeof (callback) === 'function') {
      callback(this.relatedQuery)
    }
    return this.relatedQuery.modelQueryBuilder
  }

  /**
   * Returns the existence query to be used when main
   * query is dependent upon childs.
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  counts (callback) {
    this._makeJoinQuery(true)
    this.relatedQuery.count('*').whereRaw(`${this.pivotTable}.${this.pivotLocalKey} = ${this.parent.constructor.table}.${this.fromKey}`)
    if (typeof (callback) === 'function') {
      callback(this.relatedQuery)
    }
    return this.relatedQuery.modelQueryBuilder
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
   * @param  {Object} [pivotValues]
   * @return {Boolean}
   *
   * @public
   */
  * save (relatedInstance, pivotValues) {
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
      const pivotValuesToSave = _.merge({}, this._getTimestampsForPivotTable(), pivotValues)
      yield this.attach([relatedInstance[this.toKey]], pivotValuesToSave)
      _.each(pivotValuesToSave, (value, key) => {
        relatedInstance[`${this.pivotPrefix}${key}`] = value
      })
    }
    relatedInstance[`${this.pivotPrefix}${this.pivotLocalKey}`] = this.parent[this.fromKey]
    relatedInstance[`${this.pivotPrefix}${this.pivotOtherKey}`] = relatedInstance[this.toKey]
    return isSaved
  }

  /**
   * creates the related model instance and calls save on it
   *
   * @param  {Object} values
   * @param  {Object} [pivotValues]
   * @return {Boolean}
   *
   * @public
   */
  * create (values, pivotValues) {
    const RelatedModel = this.related
    const relatedInstance = new RelatedModel(values)
    yield this.save(relatedInstance, pivotValues)
    return relatedInstance
  }

  /**
   * Throws an exception since deleting the related model
   * should be done via relation and detach should be
   * used instead.
   */
  * delete () {
    throw new CE.ModelRelationException('delete is not supported by BelongsToMany, use detach instead')
  }

  /**
   * Pick selected fields from the pivot table.
   *
   * @return {Object} this for chaining
   */
  withPivot () {
    this.pivotItems = _.concat(this.pivotItems, _.toArray(arguments))
    return this
  }

  /**
   * Updates pivot table with an object of values. Optionally
   * you can define the foriegn keys to be updated.
   *
   * @param  {Object} values
   * @param  {Array} otherKeyValue
   * @return {Promise}
   */
  updatePivot (values, otherKeyValue) {
    if (otherKeyValue && !_.isArray(otherKeyValue)) {
      otherKeyValue = [otherKeyValue]
    }

    const query = this.relatedQuery.queryBuilder
      .table(this.pivotTable)
      .where(`${this.pivotLocalKey}`, this.parent[this.fromKey])

    if (_.size(otherKeyValue)) {
      query.whereIn(`${this.pivotOtherKey}`, otherKeyValue)
    }

    return query.update(values)
  }

  /**
   * Makes sure to respect the timestamps on pivot table. Also timestamps fields
   * and values are derived by the parent model. Disabling timestamps on parent
   * model results in no impact even after using pivotTimestamps.
   */
  withTimestamps () {
    this.pivotTimestamps = true
    this.withPivot(this.parent.constructor.createTimestamp, this.parent.constructor.updateTimestamp)
    return this
  }
}

module.exports = BelongsToMany
