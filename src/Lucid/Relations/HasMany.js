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
const GE = require('@adonisjs/generic-exceptions')
const BaseRelation = require('./BaseRelation')

/**
 * HasMany relationship instance is used to define a
 * has many relation. The instance of this class
 * is obtained via @ref(Model.hasMany) method.
 *
 * @class HasMany
 * @constructor
 */
class HasMany extends BaseRelation {
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
    return _.transform(modelInstances, (result, modelInstance) => {
      if (modelInstance[this.primaryKey]) {
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
    const Serializer = this.RelatedModel.Serializer

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
        existingRelation.value.addRow(relatedInstance)
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: new Serializer([relatedInstance])
      })
      return result
    }, [])

    return { key: this.primaryKey, values: transformedValues, defaultValue: new Serializer([]) }
  }

  /**
   * Adds a where clause to limit the select search
   * to related rows only.
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   * @param  {Number}      counter
   *
   * @return {Object}
   */
  relatedWhere (count, counter) {
    /**
     * When we are making self joins, we should alias the current
     * table with the counter, which is sent by the consumer of
     * this method.
     *
     * Also the counter should be incremented by the consumer itself.
     */
    if (this.$primaryTable === this.$foreignTable) {
      this.relatedTableAlias = `sj_${counter}`
      this.relatedQuery.table(`${this.$foreignTable} AS ${this.relatedTableAlias}`)
    }

    const tableAlias = this.relatedTableAlias || this.$foreignTable
    this.relatedQuery.whereRaw(`${this.$primaryTable}.${this.primaryKey} = ${tableAlias}.${this.foreignKey}`)
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
   * key is set automatically
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
   * it to database. Foreign key is set automatically
   *
   * @method create
   *
   * @param  {Object} payload
   * @param  {Object}  [trx]
   *
   * @return {Promise}
   */
  async create (payload, trx) {
    await this._persistParentIfRequired(trx)
    payload[this.foreignKey] = this.$primaryKeyValue
    return this.RelatedModel.create(payload, trx)
  }

  /**
   * Creates an array of model instances in parallel
   *
   * @method createMany
   *
   * @param  {Array}   arrayOfPayload
   * @param  {Object}  [trx]
   *
   * @return {Array}
   */
  async createMany (arrayOfPayload, trx) {
    if (arrayOfPayload instanceof Array === false) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('hasMany.createMany expects an array of values', arrayOfPayload)
    }

    await this._persistParentIfRequired(trx)
    return Promise.all(arrayOfPayload.map((payload) => this.create(payload, trx)))
  }

  /**
   * Creates an array of model instances in parallel
   *
   * @method createMany
   *
   * @param  {Array}   arrayOfRelatedInstances
   * @param  {Object}  [trx]
   *
   * @return {Array}
   */
  async saveMany (arrayOfRelatedInstances, trx) {
    if (arrayOfRelatedInstances instanceof Array === false) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('hasMany.saveMany expects an array of related model instances', arrayOfRelatedInstances)
    }

    await this._persistParentIfRequired(trx)
    return Promise.all(arrayOfRelatedInstances.map((relatedInstance) => this.save(relatedInstance, trx)))
  }
}

module.exports = HasMany
