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
class ModelRelationException extends NE.LogicalException {}
class ModelRelationSaveException extends NE.LogicalException {}

class HasOne extends Relation {

  constructor (parent, related, primaryKey, foriegnKey) {
    super()
    this.parent = parent
    this.related = related
    this.relatedQuery = this.related.query()
    this.fromKey = primaryKey
    this.toKey = foriegnKey
  }

  /**
   * returns the first match item for related model
   *
   * @return {Object}
   *
   * @public
   */
  first () {
    if (!this.parent.$primaryKeyValue) {
      throw new ModelRelationException('cannot fetch related model from an unsaved model instance')
    }
    this.relatedQuery.where(this.toKey, this.parent.$primaryKeyValue)
    return this.relatedQuery.first()
  }

  /**
   * returns result of this.first
   *
   * @see this.first()
   * @return {Object}
   *
   * @public
   */
  fetch () {
    return this.first()
  }

  /**
   * adds with clause to related query, it almost becomes a recursive
   * loop until we get all nested relations
   *
   * @method addWith
   *
   * @param  {Array} keys
   *
   * @public
   */
  addWith (keys) {
    this.relatedQuery.with(keys)
  }

  addScope (scope, callback) {
    this.relatedQuery.scope(scope, callback)
  }

  * save (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw new ModelRelationSaveException('save accepts an instance of related model')
    }
    if (!this.parent.$primaryKeyValue) {
      throw new ModelRelationSaveException('cannot save relation for an unsaved model instance')
    }
    relatedInstance[this.toKey] = this.parent.$primaryKeyValue
    return yield relatedInstance.save()
  }

  * create (values) {
    if (!this.parent.$primaryKeyValue) {
      throw new ModelRelationSaveException('cannot create relation for an unsaved model instance')
    }
    values[this.toKey] = this.parent.$primaryKeyValue
    return yield this.related.create(values)
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
    const results = yield this.relatedQuery.whereIn(this.toKey, values).fetch()
    return results.keyBy((item) => {
      return item[this.toKey]
    }).value()
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
    const results = yield this.relatedQuery.where(this.toKey, value).first()
    const response = {}
    response[value] = results
    return response
  }

}

module.exports = HasOne
