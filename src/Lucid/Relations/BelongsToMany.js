'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * ==== Keys for User and Post model
 * primaryKey           -    user.primaryKey    -    id
 * relatedPrimaryKey    -    post.primaryKey    -    id
 * foreignKey           -    user.foreignKey    -    user_id
 * relatedForeignKey    -    post.foreignKey    -    post_id
 *
*/

const _ = require('lodash')
const BaseRelation = require('./BaseRelation')
const util = require('../../../lib/util')
const CE = require('../../Exceptions')
const PivotModel = require('../Model/PivotModel')

class BelongsToMany extends BaseRelation {
  constructor (parentInstance, relatedModel, primaryKey, foreignKey, relatedPrimaryKey, relatedForeignKey) {
    super(parentInstance, relatedModel, primaryKey, foreignKey)

    this.relatedForeignKey = relatedForeignKey
    this.relatedPrimaryKey = relatedPrimaryKey

    /**
     * Since user can define a fully qualified model for
     * pivot table, we store it under this variable.
     *
     * @type {[type]}
     */
    this._PivotModel = null

    /**
     * Settings related to pivot table only
     *
     * @type {Object}
     */
    this._pivot = {
      table: util.makePivotTableName(parentInstance.constructor.name, relatedModel.name),
      withTimestamps: false,
      withFields: []
    }
  }

  /**
   * Returns the pivot table name. The pivot model is
   * given preference over the default table name.
   *
   * @attribute $pivotTable
   *
   * @return {String}
   */
  get $pivotTable () {
    return this._PivotModel ? this._PivotModel.table : this._pivot.table
  }

  /**
   * The pivot columns to be selected
   *
   * @attribute $pivotColumns
   *
   * @return {Array}
   */
  get $pivotColumns () {
    return [this.relatedForeignKey, this.foreignKey].concat(this._pivot.withFields)
  }

  /**
   * Returns the name of select statement on pivot table
   *
   * @method _selectForPivot
   *
   * @param  {String}        field
   *
   * @return {String}
   *
   * @private
   */
  _selectForPivot (field) {
    return `${this.$pivotTable}.${field} as pivot_${field}`
  }

  /**
   * Adds a where clause on pivot table by prefixing
   * the pivot table name.
   *
   * @method _whereForPivot
   *
   * @param  {String}       operator
   * @param  {String}       key
   * @param  {...Spread}    args
   *
   * @return {void}
   *
   * @private
   */
  _whereForPivot (method, key, ...args) {
    this.relatedQuery[method](`${this.$pivotTable}.${key}`, ...args)
  }

  /**
   * Selecting fields from foriegn table and pivot
   * table
   *
   * @method _selectFields
   *
   * @return {void}
   */
  _selectFields () {
    const pivotColumns = this.$pivotColumns

    /**
     * The list of columns to be selected
     *
     * @type {Array}
     */
    const columns = _.map(pivotColumns, (column) => {
      this.relatedQuery._sideLoaded.push(`pivot_${column}`)
      return this._selectForPivot(column)
    })

    this.relatedQuery.select(`${this.$foreignTable}.*`).select(columns)
  }

  /**
   * Makes the join query
   *
   * @method _makeJoinQuery
   *
   * @return {void}
   *
   * @private
   */
  _makeJoinQuery () {
    const self = this

    /**
     * Inner join to limit the rows
     */
    this.relatedQuery.innerJoin(this.$pivotTable, function () {
      this.on(`${self.$foreignTable}.${self.relatedPrimaryKey}`, `${self.$pivotTable}.${self.relatedForeignKey}`)
    })
  }

  /**
   * Decorates the query for read/update/delete
   * operations
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
    this.wherePivot(this.foreignKey, this.$primaryKeyValue)
  }

  /**
   * Newup the pivot model set by user or the default
   * pivot model
   *
   * @method _newUpPivotModel
   *
   * @param  {Object}         attributes
   *
   * @return {Object}
   *
   * @private
   */
  _newUpPivotModel (attributes) {
    const pivotModel = new (this._PivotModel || PivotModel)()
    pivotModel.newUp(attributes)
    return pivotModel
  }

  /**
   * The pivot table values are sideloaded, so we need to remove
   * them sideload and instead set it as a relationship on
   * model instance
   *
   * @method _addPivotValuesAsRelation
   *
   * @param  {Object}                  row
   *
   * @private
   */
  _addPivotValuesAsRelation (row) {
    const pivotAttributes = {}

    /**
     * Removing pivot key/value pair from sideloaded object.
     * This is only quirky part.
     */
    row.$sideLoaded = _.omitBy(row.$sideLoaded, (value, key) => {
      if (key.startsWith('pivot_')) {
        pivotAttributes[key.replace('pivot_', '')] = value
        return true
      }
    })

    row.setRelated('pivot', this._newUpPivotModel(pivotAttributes))
  }

  /**
   * Define a fully qualified model to be used for
   * making pivot table queries and using defining
   * pivot table settings.
   *
   * @method pivotModel
   *
   * @param  {Model}   pivotModel
   *
   * @chainable
   */
  pivotModel (pivotModel) {
    this._PivotModel = pivotModel
    return this
  }

  /**
   * Define the pivot table
   *
   * @method pivotTable
   *
   * @param  {String}   table
   *
   * @chainable
   */
  pivotTable (table) {
    if (this._PivotModel) {
      throw CE.ModelRelationException.pivotModelIsDefined('pivotTable')
    }

    this._pivot.table = table
    return this
  }

  /**
   * Make sure `created_at` and `updated_at` timestamps
   * are being used
   *
   * @method withTimestamps
   *
   * @chainable
   */
  withTimestamps () {
    if (this._PivotModel) {
      throw CE.ModelRelationException.pivotModelIsDefined('withTimestamps')
    }

    this._pivot.withTimestamps = true
    return this
  }

  /**
   * Fields to be selected from pivot table
   *
   * @method withPivot
   *
   * @param  {Array}  fields
   *
   * @chainable
   */
  withFields (fields) {
    fields = _.isArray(fields) ? fields : [fields]
    this._pivot.withFields = this._pivot.withFields.concat(fields)
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
    return _.map(modelInstances, (modelInstance) => modelInstance[this.primaryKey])
  }

  /**
   * Make a where clause on the pivot table
   *
   * @method whereInPivot
   *
   * @param  {String}     key
   * @param  {...Spread}  args
   *
   * @chainable
   */
  whereInPivot (key, ...args) {
    this._whereForPivot('whereIn', key, ...args)
    return this
  }

  /**
   * Make a orWhere clause on the pivot table
   *
   * @method orWherePivot
   *
   * @param  {String}     key
   * @param  {...Spread}  args
   *
   * @chainable
   */
  orWherePivot (key, ...args) {
    this._whereForPivot('orWhere', key, ...args)
    return this
  }

  /**
   * Where clause on pivot table
   *
   * @method wherePivot
   *
   * @param  {String}    key
   * @param  {...Spread} args
   *
   * @chainable
   */
  wherePivot (key, ...args) {
    this._whereForPivot('where', key, ...args)
    return this
  }

  /**
   * Returns the eagerLoad query for the relationship
   *
   * @method eagerLoad
   *
   * @param  {Array}          rows
   *
   * @return {Object}
   */
  async eagerLoad (rows) {
    this._selectFields()
    this._makeJoinQuery()
    this.whereInPivot(this.foreignKey, this.mapValues(rows))

    const relatedInstances = await this.relatedQuery.fetch()
    return this.group(relatedInstances.rows)
  }

  /**
   * Method called when eagerloading for a single
   * instance
   *
   * @method load
   *
   * @return {Promise}
   */
  load () {
    return this.fetch()
  }

  /**
   * Execute the query and setup pivot values
   * as a relation
   *
   * @method fetch
   *
   * @return {Serializer}
   */
  async fetch () {
    const rows = await super.fetch()
    rows.rows.forEach((row) => {
      this._addPivotValuesAsRelation(row)
    })
    return rows
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
    const Serializer = this.relatedModel.Serializer

    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance.$sideLoaded[`pivot_${this.foreignKey}`]
      const existingRelation = _.find(result, (row) => row.identity === foreignKeyValue)

      /**
       * If there is an existing relation, add row to
       * the relationship
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
    this._makeJoinQuery()
    this.relatedQuery.whereRaw(`${this.$primaryTable}.${this.primaryKey} = ${this.$pivotTable}.${this.foreignKey}`)

    /**
     * Add count clause if count is required
     */
    if (count) {
      this.relatedQuery.count('*')
    }

    return this.relatedQuery.query
  }
}

module.exports = BelongsToMany
