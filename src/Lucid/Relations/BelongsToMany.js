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
const NE = require('node-exceptions')
const _ = require('lodash')
const helpers = require('../QueryBuilder/helpers')
class ModelRelationException extends NE.LogicalException {}
class ModelRelationSaveException extends NE.LogicalException {}
class ModelRelationAttachException extends NE.LogicalException {}

class BelongsToMany extends Relation {

  constructor (parent, related, pivotTable, pivotLocalKey, pivotOtherKey, primaryKey, relatedPrimaryKey) {
    super()
    const self = this
    this.parent = parent
    this.related = related
    this.relatedQuery = this.related.query()
    this.pivotTable = pivotTable
    this.toKey = relatedPrimaryKey
    this.fromKey = primaryKey
    this.pivotLocalKey = pivotLocalKey
    this.pivotOtherKey = pivotOtherKey
    this.pivotPrefix = '_pivot_'
    this.pivotItems = []
    this.relatedQuery.wherePivot = function () {
      const args = _.toArray(arguments)
      args[0] = `${self.pivotTable}.${args[0]}`
      this.where.apply(this, args)
    }
  }

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
   * fetches values from pivotTable for a give related
   * model. Returned values will be an array collection.
   *
   * @return {Array}
   *
   * @public
   */
  fetch () {
    if (!this.parent[this.fromKey]) {
      throw new ModelRelationException('cannot fetch related model from an unsaved model instance')
    }
    this._makeJoinQuery()
    this.relatedQuery.where(`${this.pivotTable}.${this.pivotLocalKey}`, this.parent[this.fromKey])
    return this.relatedQuery.fetch()
  }

  /**
   * fetches value from pivotTable for a give related
   * model. Returned value will be an instance of
   * related model.
   *
   * @return {Object}
   *
   * @public
   */
  first () {
    if (!this.parent[this.fromKey]) {
      throw new ModelRelationException('cannot fetch related model from an unsaved model instance')
    }
    this._makeJoinQuery()
    this.relatedQuery.where(`${this.pivotTable}.${this.pivotLocalKey}`, this.parent[this.fromKey])
    return this.relatedQuery.first()
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
    if (!this.parent[this.fromKey]) {
      throw new ModelRelationAttachException('cannot attach values for an unsaved model')
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

  * detach (references) {
    if (!this.parent[this.fromKey]) {
      throw new ModelRelationAttachException('cannot detach values for an unsaved model')
    }
    const query = this.relatedQuery.queryBuilder.table(this.pivotTable).where(`${this.pivotLocalKey}`, this.parent[this.fromKey])
    if (_.isArray(references)) {
      query.whereIn(`${this.pivotOtherKey}`, references)
    }
    return yield query.delete()
  }

  * save (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw new ModelRelationSaveException('save accepts an instance of related model')
    }
    if (!this.parent[this.fromKey]) {
      throw new ModelRelationSaveException('cannot save relation for an unsaved model instance')
    }
    const isSaved = yield relatedInstance.save()
    if (isSaved) {
      yield this.attach([relatedInstance[this.toKey]])
    }
    relatedInstance[`${this.pivotPrefix}${this.pivotLocalKey}`] = this.parent[this.fromKey]
    relatedInstance[`${this.pivotPrefix}${this.pivotOtherKey}`] = relatedInstance[this.toKey]
    return isSaved
  }

}

module.exports = BelongsToMany
