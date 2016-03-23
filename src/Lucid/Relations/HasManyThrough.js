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
const CE = require('../Model/customExceptions')
const helpers = require('../QueryBuilder/helpers')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

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
   * fetches values from for a given related model.
   * Returned values will be an array collection.
   *
   * @return {Array}
   *
   * @public
   */
  fetch () {
    if (this.parent.isNew()) {
      throw new CE.ModelRelationException('Cannot fetch related model from an unsaved model instance')
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to fetch relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    this._makeJoinQuery()
    this.relatedQuery.where(`${this.through.table}.${this.toKey}`, this.parent[this.fromKey])
    return this.relatedQuery.fetch()
  }

  /**
   * fetches value from for a given related model.
   * Returned value will be an instance of
   * related model.
   *
   * @return {Object}
   *
   * @public
   */
  first () {
    if (this.parent.isNew()) {
      throw new CE.ModelRelationException('Cannot fetch related model from an unsaved model instance')
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to fetch relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    this._makeJoinQuery()
    this.relatedQuery.where(`${this.through.table}.${this.toKey}`, this.parent[this.fromKey])
    return this.relatedQuery.first()
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

  * save () {
    throw new CE.ModelRelationSaveException('Cannot call save method with hasManyThrough relation')
  }

  * create () {
    throw new CE.ModelRelationSaveException('Cannot call create method with hasManyThrough relation')
  }

}

module.exports = HasManyThrough
