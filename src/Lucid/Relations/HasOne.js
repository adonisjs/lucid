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
 * The HasOne relationship defines a relation between
 * two models
 *
 * @class HasOne
 * @constructor
 */
class HasOne extends BaseRelation {
  /**
   * Persists the parent model instance if it's not
   * persisted already. This is done before saving
   * the related instance
   *
   * @method _persistParentIfRequired
   *
   * @return {void}
   *
   * @private
   */
  async _persistParentIfRequired () {
    if (this.parentInstance.isNew) {
      await this.parentInstance.save()
    }
  }

  /**
   * Returns an array of values to be used for running
   * whereIn query when eagerloading relationships.
   *
   * @method mapValues
   *
   * @param  {Array}  modelInstances - An array of model instances
   *
   * @return {Array}
   */
  mapValues (modelInstances) {
    return _.map(modelInstances, (modelInstance) => modelInstance[this.primaryKey])
  }

  /**
   * Takes an array of related instances and returns an array
   * for each parent record.
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
      const existingRelation = _.find(result, (row) => row.identity === foreignKeyValue)

      /**
       * If there is already an existing instance for same parent
       * record. We should override the value and do WARN the
       * user since hasOne should never have multiple
       * related instance.
       */
      if (existingRelation) {
        existingRelation.value = relatedInstance
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
      })
      return result
    }, [])
    return { key: this.primaryKey, values: transformedValues, defaultValue: null }
  }

  /**
   * Fetch related rows for a relationship
   *
   * @method fetch
   *
   * @alias first
   *
   * @return {Model}
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

  /**
   * Saves the related instance to the database. Foreign
   * key is set automatically.
   *
   * NOTE: This method will persist the parent model if
   * not persisted already.
   *
   * @method save
   *
   * @param  {Object} relatedInstance
   *
   * @return {Promise}
   */
  async save (relatedInstance) {
    await this._persistParentIfRequired()
    relatedInstance[this.foreignKey] = this.$primaryKeyValue
    return relatedInstance.save()
  }

  /**
   * Creates the new related instance model and persist
   * it to database. Foreign key is set automatically.
   *
   * NOTE: This method will persist the parent model if
   * not persisted already.
   *
   * @method create
   *
   * @param  {Object} payload
   *
   * @return {Promise}
   */
  async create (payload) {
    await this._persistParentIfRequired()
    payload[this.foreignKey] = this.$primaryKeyValue
    return this.RelatedModel.create(payload)
  }

  /* istanbul ignore next */
  createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', 'hasOne')
  }

  /* istanbul ignore next */
  saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'hasOne')
  }
}

module.exports = HasOne
