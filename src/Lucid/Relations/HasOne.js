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
const util = require('../../../lib/util')

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
   * @param {Object} [trx]
   *
   * @return {void}
   *
   * @private
   */
  async _persistParentIfRequired (trx) {
    if (this.parentInstance.isNew) {
      await this.parentInstance.save(trx)
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
    return _.transform(modelInstances, (result, modelInstance) => {
      if (util.existy(modelInstance[this.primaryKey])) {
        result.push(modelInstance[this.primaryKey])
      }
      return result
    }, [])
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
    const lhs = this.columnize(`${this.$primaryTable}.${this.primaryKey}`)
    const rhs = this.columnize(`${this.$foreignTable}.${this.foreignKey}`)
    this.relatedQuery.whereRaw(`${lhs} = ${rhs}`)

    if (count) {
      this.relatedQuery.count('*')
    }

    return this.relatedQuery.query
  }

  /**
   * Adds `on` clause to the innerjoin context. This
   * method is mainly used by HasManyThrough
   *
   * @method addWhereOn
   *
   * @param  {Object}   context
   */
  addWhereOn (context) {
    context.on(`${this.$primaryTable}.${this.primaryKey}`, '=', `${this.$foreignTable}.${this.foreignKey}`)
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
   * @param  {Object}  relatedInstance
   * @param  {Object}  [trx]
   *
   * @return {Promise}
   */
  async save (relatedInstance, trx) {
    await this._persistParentIfRequired(trx)
    relatedInstance[this.foreignKey] = this.$primaryKeyValue
    return relatedInstance.save(trx)
  }

  /**
   * Creates the new related instance model and persist
   * it to database. Foreign key is set automatically.
   *
   * NOTE: This method will persist the parent model if
   * not persisted already.
   *
   * @method create
   * @param  {Object}  [trx]
   *
   * @param  {Object} payload
   *
   * @return {Promise}
   */
  async create (payload, trx) {
    await this._persistParentIfRequired(trx)
    payload[this.foreignKey] = this.$primaryKeyValue
    return this.RelatedModel.create(payload, trx)
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
