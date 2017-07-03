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
    const Serializer = this.relatedModel.Serializer

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
   * key is set automatically
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
   * it to database. Foreign key is set automatically
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
    return this.relatedModel.create(payload)
  }

  /**
   * Creates an array of model instances in parallel
   *
   * @method createMany
   *
   * @param  {Array}   arrayOfPayload
   *
   * @return {Array}
   */
  async createMany (arrayOfPayload) {
    if (arrayOfPayload instanceof Array === false) {
      throw CE.InvalidArgumentException.invalidParamter('hasMany.createMany expects an array of values')
    }

    await this._persistParentIfRequired()
    return Promise.all(arrayOfPayload.map((payload) => this.create(payload)))
  }

  /**
   * Creates an array of model instances in parallel
   *
   * @method createMany
   *
   * @param  {Array}   arrayOfRelatedInstances
   *
   * @return {Array}
   */
  async saveMany (arrayOfRelatedInstances) {
    if (arrayOfRelatedInstances instanceof Array === false) {
      throw CE.InvalidArgumentException.invalidParamter('hasMany.saveMany expects an array of related model instances')
    }

    await this._persistParentIfRequired()
    return Promise.all(arrayOfRelatedInstances.map((relatedInstance) => this.save(relatedInstance)))
  }
}

module.exports = HasMany
