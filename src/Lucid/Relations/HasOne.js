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
  constructor (parentInstance, relatedModel, primaryKey, foreignKey) {
    super(parentInstance, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns the value for the primary key set on
   * the relationship
   *
   * @attribute $primaryKeyValue
   *
   * @return {Mixed}
   */
  get $primaryKeyValue () {
    return this.parentInstance[this.primaryKey]
  }

  /**
   * The primary table in relationship
   *
   * @attribute $primaryTable
   *
   * @return {String}
   */
  get $primaryTable () {
    return this.parentInstance.constructor.table
  }

  /**
   * The foreign table in relationship
   *
   * @attribute $foriegnTable
   *
   * @return {String}
   */
  get $foriegnTable () {
    return this.relatedModel.table
  }

  /**
   * Decorates the query instance with the required where
   * clause. This method should be called internally by
   * all read/update methods.
   *
   * @method _decorateQuery
   *
   * @return {void}
   *
   * @private
   */
  _decorateQuery () {
    this.query.where(this.foreignKey, this.$primaryKeyValue)
  }

  /**
   * Validates the read operation
   *
   * @method _validateRead
   *
   * @return {void}
   *
   * @throws {RuntimeException} If parent model is not persisted
   *
   * @private
   */
  _validateRead () {
    if (!this.$primaryKeyValue || !this.parentInstance.$persisted) {
      throw CE.RuntimeException.unSavedModel(this.parentInstance.constructor.name)
    }
  }

  /**
   * Load a single relationship from parent to child
   * model, but only for one row.
   *
   * @method load
   *
   * @param  {String|Number}     value
   *
   * @return {Model}
   */
  load () {
    return this.query.where(this.foreignKey, this.$primaryKeyValue).first()
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
   * Returns the related where query
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   *
   * @return {Object}
   */
  relatedWhere (count) {
    this.query.whereRaw(`${this.$primaryTable}.${this.primaryKey} = ${this.$foriegnTable}.${this.foreignKey}`)
    if (count) {
      this.query.count('*')
    }
    return this.query.query
  }
}

module.exports = HasOne
