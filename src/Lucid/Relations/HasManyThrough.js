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
 * BelongsToMany class builds relationship between
 * two models with the help of pivot table/model
 *
 * @class BelongsToMany
 * @constructor
 */
class HasManyThrough extends BaseRelation {
  constructor (parentInstance, RelatedModel, relatedMethod, primaryKey, foreignKey) {
    super(parentInstance, RelatedModel, primaryKey, foreignKey)
    this._relatedModelRelation = new RelatedModel()[relatedMethod]()
    this.relatedQuery = this._relatedModelRelation.relatedQuery
    this._relatedFields = []
    this._throughFields = []
    this._fields = []
  }

  /**
   * The join query to target the right set of
   * rows
   *
   * @method _makeJoinQuery
   *
   * @return {void}
   *
   * @private
   */
  _makeJoinQuery () {
    const self = this
    this.relatedQuery.innerJoin(this.$foreignTable, function () {
      self._relatedModelRelation.addWhereOn(this)
    })
  }

  /**
   * Selects fields with proper table prefixes, also
   * all through model fields are set for sideloading,
   * so that model properties are not polluted.
   *
   * @method _selectFields
   *
   * @return {void}
   *
   * @private
   */
  _selectFields () {
    if (!_.size(this._relatedFields)) {
      this.selectRelated('*')
    }

    const relatedFields = _.map(_.uniq(this._relatedFields), (field) => {
      return `${this._relatedModelRelation.$foreignTable}.${field}`
    })

    const throughFields = _.map(_.uniq(this._throughFields), (field) => {
      this.relatedQuery._sideLoaded.push(`through_${field}`)
      return `${this.$foreignTable}.${field} as through_${field}`
    })

    const fields = _.map(_.uniq(this._fields), (field) => `${this.$primaryTable}.${field}`)

    this.relatedQuery.select(fields.concat(relatedFields).concat(throughFields))
  }

  /**
   * Decorate the query for reads, updates and
   * deletes
   *
   * @method _decorateQuery
   *
   * @return {void}
   *
   * @private
   */
  _decorateQuery () {
    this._selectFields()
    this._makeJoinQuery()
    this.relatedQuery.where(`${this.$foreignTable}.${this.foreignKey}`, this.$primaryKeyValue)
  }

  /**
   * Select fields from the primary table
   *
   * @method select
   *
   * @param  {Array} columns
   *
   * @chainable
   */
  select (columns) {
    const columnsArray = _.isArray(columns) ? columns : _.toArray(arguments)
    this._fields = this._fields.concat(columnsArray)
    return this
  }

  /**
   * Select fields from the through table.
   *
   * @method selectThrough
   *
   * @param  {Array}      columns
   *
   * @chainable
   */
  selectThrough (columns) {
    const columnsArray = _.isArray(columns) ? columns : _.toArray(arguments)
    this._throughFields = this._throughFields.concat(columnsArray)
    return this
  }

  /**
   * Select fields from the related table
   *
   * @method selectRelated
   *
   * @param  {Array}      columns
   *
   * @chainable
   */
  selectRelated (columns) {
    const columnsArray = _.isArray(columns) ? columns : _.toArray(arguments)
    this._relatedFields = this._relatedFields.concat(columnsArray)
    return this
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
   * Returns the eagerLoad query for the relationship
   *
   * @method eagerLoad
   * @async
   *
   * @param  {Array}          rows
   *
   * @return {Object}
   */
  async eagerLoad (rows) {
    this.selectThrough(this.foreignKey)
    this._selectFields()
    this._makeJoinQuery()

    const relatedInstances = await this.relatedQuery
      .whereIn(`${this.$foreignTable}.${this.foreignKey}`, this.mapValues(rows))
      .fetch()

    return this.group(relatedInstances.rows)
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
      const foreignKeyValue = relatedInstance.$sideLoaded[`through_${this.foreignKey}`]
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
   * Adds `on` clause to the innerjoin context. This
   * method is mainly used by HasManyThrough
   *
   * @method addWhereOn
   *
   * @param  {Object}   context
   */
  relatedWhere (count) {
    this._makeJoinQuery()
    this.relatedQuery.whereRaw(`${this.$primaryTable}.${this.primaryKey} = ${this.$foreignTable}.${this.foreignKey}`)

    /**
     * Add count clause if count is required
     */
    if (count) {
      this.relatedQuery.count('*')
    }

    return this.relatedQuery.query
  }

  /* istanbul ignore next */
  create () {
    throw CE.ModelRelationException.unSupportedMethod('create', 'HasManyThrough')
  }

  /* istanbul ignore next */
  save () {
    throw CE.ModelRelationException.unSupportedMethod('save', 'HasManyThrough')
  }

  /* istanbul ignore next */
  createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', 'HasManyThrough')
  }

  /* istanbul ignore next */
  saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'HasManyThrough')
  }
}

module.exports = HasManyThrough
