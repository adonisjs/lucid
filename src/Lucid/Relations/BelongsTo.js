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
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

class BelongsTo extends Relation {

  constructor (parent, related, primaryKey, foreignKey) {
    super(parent, related)
    this.toKey = primaryKey || this.related.primaryKey
    this.fromKey = foreignKey || this.related.foreignKey
  }

  /**
   * empty placeholder to be used when unable to eagerload
   * relations. It needs to be an array of many to many
   * relationships.
   *
   * @method eagerLoadFallbackValue
   *
   * @return {Null}
   */
  get eagerLoadFallbackValue () {
    return null
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
   * belongsTo cannot have paginate, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  paginate () {
    throw CE.ModelRelationException.unSupportedMethod('paginate', this.constructor.name)
  }

  /**
   * overrides base save method to throw an error, as
   * belongsTo does not support save method
   *
   * @public
   */
  * save () {
    throw CE.ModelRelationException.unSupportedMethod('save', this.constructor.name)
  }

  /**
   * overrides base create method to throw an error, as
   * belongsTo does not support create method
   *
   * @public
   */
  * create () {
    throw CE.ModelRelationException.unSupportedMethod('create', this.constructor.name)
  }

  /**
   * belongsTo cannot have createMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  * createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', this.constructor.name)
  }

  /**
   * belongsTo cannot have saveMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  * saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', this.constructor.name)
  }

  /**
   * associates a related model to the parent model by setting
   * up foreignKey value
   *
   * @param  {Object}  relatedInstance
   *
   * @public
   */
  associate (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw CE.ModelRelationException.relationMisMatch('associate accepts an instance of related model')
    }
    if (relatedInstance.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('associate', this.parent.constructor.name, this.related.name)
    }
    if (!relatedInstance[this.toKey]) {
      logger.warn(`Trying to associate relationship with ${this.toKey} as foriegnKey, whose value is falsy`)
    }
    this.parent[this.fromKey] = relatedInstance[this.toKey]
  }

  /**
   * dissociate a related model from the parent model by setting
   * foreignKey to null
   *
   * @public
   */
  dissociate () {
    this.parent[this.fromKey] = null
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

module.exports = BelongsTo
