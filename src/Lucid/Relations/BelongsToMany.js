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
const GE = require('@adonisjs/generic-exceptions')

const BaseRelation = require('./BaseRelation')
const util = require('../../../lib/util')
const CE = require('../../Exceptions')
const PivotModel = require('../Model/PivotModel')

/**
 * BelongsToMany class builds relationship between
 * two models with the help of pivot table/model
 *
 * @class BelongsToMany
 * @constructor
 */
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

    this._relatedFields = []

    /**
     * Here we store the existing pivot rows, to make
     * sure we are not inserting duplicates.
     *
     * @type {Array}
     */
    this._existingPivotInstances = []

    /**
     * The eagerloadFn is used to make the eagerloading
     * query for a given relationship. The end-user
     * can override this method by passing a
     * custom closure to `eagerLoadQuery`
     * method.
     *
     * @method _eagerLoadFn
     *
     * @param  {Object} query
     * @param  {String} fk
     * @param  {Array}  values
     *
     * @return {void}
     */
    this._eagerLoadFn = (query, fk, values) => {
      this._selectFields()
      this._makeJoinQuery()
      this.whereInPivot(fk, values)
    }
  }

  /**
   * The colums to be selected from the related
   * query
   *
   * @method select
   *
   * @param  {Array} columns
   *
   * @chainable
   */
  select (columns) {
    this._relatedFields = _.isArray(columns) ? columns : _.toArray(arguments)
    return this
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
     * The list of pivotFields to be selected
     *
     * @type {Array}
     */
    const pivotFields = _.map(pivotColumns, (column) => {
      this.relatedQuery._sideLoaded.push(`pivot_${column}`)
      return this._selectForPivot(column)
    })

    const relatedFields = _.size(this._relatedFields) ? this._relatedFields.map((field) => {
      return `${this.$foreignTable}.${field}`
    }) : `${this.$foreignTable}.*`

    this.relatedQuery.select(relatedFields).select(pivotFields)
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
   * @return {Object}
   *
   * @private
   */
  _newUpPivotModel () {
    return new (this._PivotModel || PivotModel)()
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

    const pivotModel = this._newUpPivotModel()
    pivotModel.newUp(pivotAttributes)
    row.setRelated('pivot', pivotModel)
  }

  /**
   * Saves the relationship to the pivot table
   *
   * @method _attachSingle
   * @async
   *
   * @param  {Number|String}      value
   * @param  {Function}           [pivotCallback]
   *
   * @return {Object}                    Instance of pivot model
   *
   * @private
   */
  async _attachSingle (value, pivotCallback) {
    /**
     * The relationship values
     *
     * @type {Object}
     */
    const pivotValues = {
      [this.relatedForeignKey]: value,
      [this.foreignKey]: this.$primaryKeyValue
    }

    const pivotModel = this._newUpPivotModel()
    this._existingPivotInstances.push(pivotModel)
    pivotModel.fill(pivotValues)

    /**
     * Set $table, $timestamps, $connection when there
     * is no pre-defined pivot model.
     */
    if (!this._PivotModel) {
      pivotModel.$table = this.$pivotTable
      pivotModel.$connection = this.RelatedModel.connection
      pivotModel.$withTimestamps = this._pivot.withTimestamps
    }

    /**
     * If pivot callback is defined, do call it. This gives
     * chance to the user to set additional fields to the
     * model.
     */
    if (typeof (pivotCallback) === 'function') {
      pivotCallback(pivotModel)
    }

    await pivotModel.save()
    return pivotModel
  }

  /**
   * Persists the parent model instance if it's not
   * persisted already. This is done before saving
   * the related instance
   *
   * @method _persistParentIfRequired
   * @async
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
   * Loads the pivot relationship and then caches
   * it inside memory, so that more calls to
   * this function are not hitting database.
   *
   * @method _loadAndCachePivot
   * @async
   *
   * @return {void}
   *
   * @private
   */
  async _loadAndCachePivot () {
    if (_.size(this._existingPivotInstances) === 0) {
      this._existingPivotInstances = (await this
          .pivotQuery().fetch()
      ).rows
    }
  }

  /**
   * Returns the existing pivot instance for a given
   * value.
   *
   * @method _getPivotInstance
   *
   * @param  {String|Number}          value
   *
   * @return {Object|Null}
   *
   * @private
   */
  _getPivotInstance (value) {
    return _.find(this._existingPivotInstances, (instance) => instance[this.relatedForeignKey] === value)
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
  withPivot (fields) {
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
    return _.transform(modelInstances, (result, modelInstance) => {
      if (modelInstance[this.primaryKey]) {
        result.push(modelInstance[this.primaryKey])
      }
      return result
    }, [])
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
   * Make a andWhere clause on the pivot table
   *
   * @method andWherePivot
   *
   * @param  {String}     key
   * @param  {...Spread}  args
   *
   * @chainable
   */
  andWherePivot (key, ...args) {
    this._whereForPivot('andWhere', key, ...args)
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
   * @async
   *
   * @param  {Array}          rows
   *
   * @return {Object}
   */
  async eagerLoad (rows) {
    this._eagerLoadFn(this.relatedQuery, this.foreignKey, this.mapValues(rows))
    const relatedInstances = await this.relatedQuery.fetch()
    return this.group(relatedInstances.rows)
  }

  /**
   * Method called when eagerloading for a single
   * instance
   *
   * @method load
   * @async
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
   * @async
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
    const Serializer = this.RelatedModel.Serializer

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
   * Returns the query for pivot table
   *
   * @method pivotQuery
   *
   * @param {Boolean} selectFields
   *
   * @return {Object}
   */
  pivotQuery (selectFields = true) {
    const query = this._PivotModel
      ? this._PivotModel.query()
      : new PivotModel().query(this.$pivotTable, this.RelatedModel.$connection)

    if (selectFields) {
      query.select(this.$pivotColumns)
    }

    query.where(this.foreignKey, this.$primaryKeyValue)
    return query
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

  /**
   * Adds `on` clause to the innerjoin context. This
   * method is mainly used by HasManyThrough
   *
   * @method addWhereOn
   *
   * @param  {Object}   context
   */
  addWhereOn (context) {
    this._makeJoinQuery()
    context.on(`${this.$primaryTable}.${this.primaryKey}`, '=', `${this.$pivotTable}.${this.foreignKey}`)
  }

  /**
   * Returns count of rows.
   *
   * @method count
   *
   * @param  {String} expression
   *
   * @return {Array}
   */
  count (expression) {
    this._validateRead()
    this._makeJoinQuery()
    this.wherePivot(this.foreignKey, this.$primaryKeyValue)
    return this.relatedQuery.count(expression)
  }

  /**
   * Returns avg for a given column
   *
   * @method avg
   *
   * @param  {String} column
   *
   * @return {Array}
   */
  avg (column) {
    this._validateRead()
    this._makeJoinQuery()
    this.wherePivot(this.foreignKey, this.$primaryKeyValue)
    return this.relatedQuery.avg(column)
  }

  /**
   * Return min value for a column
   *
   * @method avg
   *
   * @param  {String} column
   *
   * @return {Array}
   */
  min (column) {
    this._validateRead()
    this._makeJoinQuery()
    this.wherePivot(this.foreignKey, this.$primaryKeyValue)
    return this.relatedQuery.min(column)
  }

  /**
   * Return max value for a column
   *
   * @method avg
   *
   * @param  {String} column
   *
   * @return {Array}
   */
  max (column) {
    this._validateRead()
    this._makeJoinQuery()
    this.wherePivot(this.foreignKey, this.$primaryKeyValue)
    return this.relatedQuery.max(column)
  }

  /**
   * Attach existing rows inside pivot table as a relationship
   *
   * @method attach
   *
   * @param  {Number|String|Array} relatedPrimaryKeyValue
   * @param  {Function} [pivotCallback]
   *
   * @return {Promise}
   */
  async attach (references, pivotCallback = null) {
    await this._loadAndCachePivot()
    const rows = references instanceof Array === false ? [references] : references

    return Promise.all(rows.map((row) => {
      const pivotInstance = this._getPivotInstance(row)
      return pivotInstance ? Promise.resolve(pivotInstance) : this._attachSingle(row, pivotCallback)
    }))
  }

  /**
   * Delete related model rows in bulk and also detach
   * them from the pivot table.
   *
   * NOTE: This method will run 3 queries in total. First is to
   * fetch the related rows, next is to delete them and final
   * is to remove the relationship from pivot table.
   *
   * @method delete
   * @async
   *
   * @return {Number} Number of effected rows
   */
  async delete () {
    const foreignKeyValues = await this.ids()
    const effectedRows = await this.RelatedModel
      .query()
      .whereIn(this.RelatedModel.primaryKey, foreignKeyValues)
      .delete()

    await this.detach(foreignKeyValues)
    return effectedRows
  }

  /**
   * Update related rows
   *
   * @method update
   *
   * @param  {Object} values
   *
   * @return {Number}        Number of effected rows
   */
  async update (values) {
    const foreignKeyValues = await this.ids()
    return this.RelatedModel
      .query()
      .whereIn(this.RelatedModel.primaryKey, foreignKeyValues)
      .update(values)
  }

  /**
   * Detach existing relations from the pivot table
   *
   * @method detach
   * @async
   *
   * @param  {Array} references
   *
   * @return {Number}  The number of effected rows
   */
  detach (references) {
    const query = this.pivotQuery(false)
    if (references) {
      const rows = references instanceof Array === false ? [references] : references
      query.whereIn(this.relatedForeignKey, rows)
      _.remove(this._existingPivotInstances, (pivotInstance) => {
        return _.includes(rows, pivotInstance[this.relatedForeignKey])
      })
    } else {
      this._existingPivotInstances = []
    }
    return query.delete()
  }

  /**
   * Save the related model instance and setup the relationship
   * inside pivot table
   *
   * @method save
   *
   * @param  {Object} relatedInstance
   * @param  {Function} pivotCallback
   *
   * @return {void}
   */
  async save (relatedInstance, pivotCallback) {
    await this._persistParentIfRequired()

    /**
     * Only save related instance when not persisted already. This is
     * only required in belongsToMany since relatedInstance is not
     * made dirty by this method.
     */
    if (relatedInstance.isNew || relatedInstance.isDirty) {
      await relatedInstance.save()
    }

    /**
     * Attach the pivot rows
     */
    const pivotRows = await this.attach(relatedInstance.primaryKeyValue, pivotCallback)

    /**
     * Set saved pivot row as a relationship
     */
    relatedInstance.setRelated('pivot', pivotRows[0])
  }

  /**
   * Save multiple relationships to the database. This method
   * will run queries in parallel
   *
   * @method saveMany
   * @async
   *
   * @param  {Array}    arrayOfRelatedInstances
   * @param  {Function} [pivotCallback]
   *
   * @return {void}
   */
  async saveMany (arrayOfRelatedInstances, pivotCallback) {
    if (arrayOfRelatedInstances instanceof Array === false) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('belongsToMany.saveMany expects an array of related model instances', arrayOfRelatedInstances)
    }

    await this._persistParentIfRequired()
    return Promise.all(arrayOfRelatedInstances.map((relatedInstance) => this.save(relatedInstance, pivotCallback)))
  }

  /**
   * Creates a new related model instance and persist
   * the relationship inside pivot table
   *
   * @method create
   * @async
   *
   * @param  {Object}   row
   * @param  {Function} [pivotCallback]
   *
   * @return {Object}               Instance of related model
   */
  async create (row, pivotCallback) {
    await this._persistParentIfRequired()

    const relatedInstance = new this.RelatedModel()
    relatedInstance.fill(row)
    await this.save(relatedInstance, pivotCallback)

    return relatedInstance
  }

  /**
   * Creates multiple related relationships. This method will
   * call all queries in parallel
   *
   * @method createMany
   * @async
   *
   * @param  {Array}   rows
   * @param  {Function}   pivotCallback
   *
   * @return {Array}
   */
  async createMany (rows, pivotCallback) {
    if (rows instanceof Array === false) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('belongsToMany.createMany expects an array of related model instances', rows)
    }

    await this._persistParentIfRequired()
    return Promise.all(rows.map((relatedInstance) => this.create(relatedInstance, pivotCallback)))
  }
}

module.exports = BelongsToMany
