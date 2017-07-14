'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const BaseRelation = require('./BaseRelation')
const CE = require('../../Exceptions')

/**
 * The BelongsTo relationship defines a relation between
 * two models
 *
 * @class BelongsTo
 * @constructor
 */
class BelongsTo extends BaseRelation {
  /**
   * Map values from model instances to an array. It is required
   * to make `whereIn` query when eagerloading results.
   *
   * @method mapValues
   *
   * @param  {Array}  modelInstances
   *
   * @return {Array}
   */
  mapValues (modelInstances) {
    return _.map(modelInstances, (modelInstance) => modelInstance[this.primaryKey])
  }

  /**
   * Groups related instances with their foriegn keys
   *
   * @method group
   *
   * @param  {Array} relatedInstances
   *
   * @return {Object} @multiple([key=String, values=Array, defaultValue=Null])
   */
  group (relatedInstances) {
    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance[this.foreignKey]
      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
      })
      return result
    }, [])

    return { key: this.primaryKey, values: transformedValues, defaultValue: null }
  }

  /**
   * Overriding fetch to call first, since belongsTo
   * can never have many rows
   *
   * @method fetch
   * @async
   *
   * @return {Object}
   */
  fetch () {
    return this.first()
  }

  /**
   * Adds a where clause to limit the select search
   * to related rows only.
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   *
   * @return {Object}
   */
  relatedWhere (count) {
    this.relatedQuery.whereRaw(`${this.$primaryTable}.${this.primaryKey} = ${this.$foreignTable}.${this.foreignKey}`)
    if (count) {
      this.relatedQuery.count('*')
    }
    return this.relatedQuery.query
  }

  addWhereOn (context) {
    context.on(`${this.$primaryTable}.${this.primaryKey}`, '=', `${this.$foreignTable}.${this.foreignKey}`)
  }

  /* istanbul ignore next */
  create () {
    throw CE.ModelRelationException.unSupportedMethod('create', 'belongsTo')
  }

  /* istanbul ignore next */
  save () {
    throw CE.ModelRelationException.unSupportedMethod('save', 'belongsTo')
  }

  /* istanbul ignore next */
  createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', 'belongsTo')
  }

  /* istanbul ignore next */
  saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'belongsTo')
  }

  /**
   * Associate 2 models together, also this method will save
   * the related model if not already persisted
   *
   * @method associate
   * @async
   *
   * @param  {Object}  relatedInstance
   *
   * @return {Promise}
   */
  async associate (relatedInstance) {
    if (relatedInstance.isNew) {
      await relatedInstance.save()
    }

    this.parentInstance[this.primaryKey] = relatedInstance[this.foreignKey]
    return this.parentInstance.save()
  }

  /**
   * Dissociate relationship from database by setting `foriegnKey` to null
   *
   * @method dissociate
   * @async
   *
   * @return {Promise}
   */
  async dissociate () {
    if (this.parentInstance.isNew) {
      throw CE.ModelRelationException.unsavedModelInstance('Cannot dissociate relationship since model instance is not persisted')
    }

    this.parentInstance[this.primaryKey] = null
    return this.parentInstance.save()
  }
}

module.exports = BelongsTo
