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
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')

class MorphTo extends Relation {
  constructor (parent, determiner, primaryKey) {
    super(parent)
    this.toKey = primaryKey || this.parent.constructor.primaryKey
    this.fromKey = determiner ? `${determiner}_id` : 'parent_id'
    this.typeKey = determiner ? `${determiner}_type` : 'parent_type'
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
   * morphTo cannot have paginate, since it
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
   * morphTo does not support save method
   *
   * @public
   */
  * save () {
    throw CE.ModelRelationException.unSupportedMethod('save', this.constructor.name)
  }

  /**
   * overrides base create method to throw an error, as
   * morphTo does not support create method
   *
   * @public
   */
  * create () {
    throw CE.ModelRelationException.unSupportedMethod('create', this.constructor.name)
  }

  /**
   * morphTo cannot have createMany, since it
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
   * morphTo cannot have saveMany, since it
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
    if (!Relation.morphKey(relatedInstance)) {
      const morphModels = _.reduce(Relation.morphMap({}, false), (result, value) => {
        result.push(value.name)
        return result
      }, [])
      throw CE.ModelRelationException.relationMisMatch(`associate accepts an instance one of: ${morphModels.join(', ')}`)
    }
    if (relatedInstance.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('associate', this.parent.constructor.name, relatedInstance.constructor.name)
    }
    if (!relatedInstance[this.toKey]) {
      logger.warn(`Trying to associate relationship with ${this.toKey} as foriegnKey, whose value is falsy`)
    }
    this.parent[this.fromKey] = relatedInstance[this.toKey]
    this.parent[this.typeKey] = Relation.morphKey(relatedInstance)
  }

  /**
   * dissociate a related model from the parent model by setting
   * foreignKey to null
   *
   * @public
   */
  dissociate () {
    this.parent[this.fromKey] = null
    this.parent[this.typeKey] = null
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
  * eagerLoad (values, scopeMethod, results) {
    const groups = _.groupBy(results, this.typeKey)
    let relates = {}
    for (let type in groups) {
      const groupResults = groups[type]
      const relatedModel = this._resolveModel(Relation.morphModel(type))
      const parentIds = _(groupResults).map(this.fromKey).uniq().value()
      const relatedQuery = relatedModel.query()
      if (typeof (scopeMethod) === 'function') {
        scopeMethod(relatedQuery)
      }
      let groupParent = yield relatedQuery.whereIn(this.toKey, parentIds).fetch()
      for (let parent of groupParent.value()) {
        const subResults = _.filter(groupResults, result => result[this.fromKey] === parent[this.toKey])
        for (let result of subResults) {
          relates[result[this.toKey]] = parent
        }
      }
    }
    return relates
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
  * eagerLoadSingle (value, scopeMethod, result) {
    const relatedModel = this._resolveModel(Relation.morphModel(result[this.typeKey]))
    const relatedQuery = relatedModel.query()
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(relatedQuery)
    }
    const relate = yield relatedQuery
      .where(this.toKey, result[this.fromKey])
      .first()
    const response = {}
    response[value] = relate
    return response
  }

  /**
   *
   * @public
   *
   */
  * first () {
    const relatedModel = this._resolveModel(Relation.morphModel(this.parent[this.typeKey]))
    return yield relatedModel.query().where(this.toKey, this.parent[this.fromKey]).first()
  }
}

module.exports = MorphTo
