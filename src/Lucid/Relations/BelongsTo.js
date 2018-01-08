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
 * The BelongsTo relationship defines a relation between
 * two models
 *
 * @class BelongsTo
 * @constructor
 */
class BelongsTo extends BaseRelation {
  /**
   * Returns the first row for the related model
   *
   * @method first
   *
   * @return {Object|Null}
   */
  first () {
    if (!this.parentInstance.$persisted) {
      throw CE.RuntimeException.unSavedModel(this.parentInstance.constructor.name)
    }

    if (!util.existy(this.$primaryKeyValue)) {
      return null
    }

    this._decorateQuery()
    return this.relatedQuery.first()
  }

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
    return _.transform(modelInstances, (result, modelInstance) => {
      if (util.existy(modelInstance[this.primaryKey])) {
        result.push(modelInstance[this.primaryKey])
      }
      return result
    }, [])
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
   * @param  {Integer}     counter
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

    const lhs = this.columnize(`${this.$primaryTable}.${this.primaryKey}`)
    const rhs = this.columnize(`${tableAlias}.${this.foreignKey}`)
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
   * @param  {Object}  [trx]
   *
   * @return {Promise}
   */
  async associate (relatedInstance, trx) {
    if (relatedInstance.isNew) {
      await relatedInstance.save(trx)
    }

    this.parentInstance[this.primaryKey] = relatedInstance[this.foreignKey]
    return this.parentInstance.save(trx)
  }

  /**
   * Dissociate relationship from database by setting `foriegnKey` to null
   *
   * @method dissociate
   * @async
   *
   * @param  {Object}  [trx]
   *
   * @return {Promise}
   */
  async dissociate (trx) {
    if (this.parentInstance.isNew) {
      throw CE.ModelRelationException.unsavedModelInstance('Cannot dissociate relationship since model instance is not persisted')
    }

    this.parentInstance[this.primaryKey] = null
    return this.parentInstance.save(trx)
  }
}

module.exports = BelongsTo
