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
const { ioc } = require('../../../lib/iocResolver')

const BaseRelation = require('./BaseRelation')
const util = require('../../../lib/util')
const CE = require('../../Exceptions')
const PivotModel = require('../Model/PivotModel')

const aggregates = [
  'sum',
  'sumDistinct',
  'avg',
  'avgDistinct',
  'min',
  'max',
  'count',
  'countDistinct'
]

const shortHandAggregates = [
  'getSum',
  'getSumDistinct',
  'getAvg',
  'getAvgDistinct',
  'getMin',
  'getMax',
  'getCount',
  'getCountDistinct'
]

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
    this.scopesIterator = null

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
      this._applyScopes()
    }

    this.relatedQuery.$relation.pivot = this._pivot
    this.relatedQuery.$relation.relatedForeignKey = relatedForeignKey
    this.relatedQuery.$relation.relatedPrimaryKey = relatedPrimaryKey
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
   * Applies global scopes when pivot model is defined
   *
   * @return {void}
   *
   * @private
   */
  _applyScopes () {
    if (this.scopesIterator) {
      this.scopesIterator.execute(this)
    }
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
    const foreignTable = this.relatedTableAlias || this.$foreignTable

    /**
     * Inner join to limit the rows
     */
    this.relatedQuery.innerJoin(this.$pivotTable, function () {
      this.on(`${foreignTable}.${self.relatedPrimaryKey}`, `${self.$pivotTable}.${self.relatedForeignKey}`)
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
    this._applyScopes()
  }

  /**
   * Prepares the query to run an aggregate functions
   *
   * @method _prepareAggregate
   *
   * @return {void}
   *
   * @private
   */
  _prepareAggregate () {
    this._makeJoinQuery()
    this.wherePivot(this.foreignKey, this.$primaryKeyValue)
    this._applyScopes()
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
   * @param  {Object}             [trx]
   *
   * @return {Object}                    Instance of pivot model
   *
   * @private
   */
  async _attachSingle (value, pivotCallback, trx) {
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

    await pivotModel.save(trx)
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
  async _loadAndCachePivot (trx) {
    if (_.size(this._existingPivotInstances) === 0) {
      const query = this.pivotQuery()

      if (trx) {
        query.transacting(trx)
      }

      const result = await query.fetch()
      this._existingPivotInstances = result.rows
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
    this._PivotModel = typeof (pivotModel) === 'string' ? ioc.use(pivotModel) : pivotModel
    this.scopesIterator = this._PivotModel.$globalScopes.iterator()
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
      if (util.existy(modelInstance[this.primaryKey])) {
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
    const mappedRows = this.mapValues(rows)
    if (!mappedRows || !mappedRows.length) {
      return this.group([])
    }
    this._eagerLoadFn(this.relatedQuery, this.foreignKey, mappedRows)
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
   * Fetch ids for the related model
   *
   * @method ids
   *
   * @return {Array}
   */
  ids () {
    return this.pluck(`${this.$foreignTable}.${this.RelatedModel.primaryKey}`)
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
    const Serializer = this.RelatedModel.resolveSerializer()

    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance.$sideLoaded[`pivot_${this.foreignKey}`]
      const existingRelation = _.find(result, (row) => row.identity === foreignKeyValue)
      this._addPivotValuesAsRelation(relatedInstance)

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
      this.relatedQuery.table(`${this.$foreignTable} as ${this.relatedTableAlias}`)
    }

    this._makeJoinQuery()

    const lhs = this.columnize(`${this.$primaryTable}.${this.primaryKey}`)
    const rhs = this.columnize(`${this.$pivotTable}.${this.foreignKey}`)
    this.relatedQuery.whereRaw(`${lhs} = ${rhs}`)

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
   * Attach existing rows inside pivot table as a relationship
   *
   * @method attach
   *
   * @param  {Number|String|Array} references
   * @param  {Function} [pivotCallback]
   * @param  {trx} Transaction
   *
   * @return {Promise}
   */
  async attach (references, pivotCallback = null, trx) {
    await this._loadAndCachePivot(trx)
    const rows = !Array.isArray(references) ? [references] : references

    return Promise.all(rows.map((row) => {
      const pivotInstance = this._getPivotInstance(row)
      return pivotInstance ? Promise.resolve(pivotInstance) : this._attachSingle(row, pivotCallback, trx)
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
   * @param  {Array}  references
   * @param  {Object} trx
   *
   * @return {Number}  The number of effected rows
   */
  detach (references, trx) {
    const query = this.pivotQuery(false)

    if (references) {
      const rows = !Array.isArray(references) ? [references] : references
      query.whereIn(this.relatedForeignKey, rows)
      _.remove(this._existingPivotInstances, (pivotInstance) => {
        return _.includes(rows, pivotInstance[this.relatedForeignKey])
      })
    } else {
      this._existingPivotInstances = []
    }

    /**
     * Wrap inside transaction if trx is passed
     */
    if (trx) {
      query.transacting(trx)
    }

    return query.delete()
  }

  /**
   * Calls `detach` and `attach` together.
   *
   * @method sync
   *
   * @param  {Number|String|Array} relatedPrimaryKeyValue
   * @param  {Function} [pivotCallback]
   *
   * @return {void}
   */
  async sync (references, pivotCallback, trx) {
    await this.detach(null, trx)
    return this.attach(references, pivotCallback, trx)
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
    const pivotRows = await this.attach(relatedInstance[this.relatedPrimaryKey], pivotCallback)

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
    if (!Array.isArray(arrayOfRelatedInstances)) {
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
    if (!Array.isArray(rows)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter('belongsToMany.createMany expects an array of related model instances', rows)
    }

    await this._persistParentIfRequired()
    return Promise.all(rows.map((relatedInstance) => this.create(relatedInstance, pivotCallback)))
  }
}

/**
 * Adding all aggregate methods at once.
 */
aggregates.forEach((method) => {
  BelongsToMany.prototype[method] = function (expression) {
    this._validateRead()
    this._prepareAggregate()
    return this.relatedQuery[method](expression)
  }
})

/**
 * Adding all short hand aggregate methods at once.
 */
shortHandAggregates.forEach((method) => {
  BelongsToMany.prototype[method] = function (expression) {
    this._validateRead()
    this._selectFields()
    this._prepareAggregate()
    return this.relatedQuery[method](expression)
  }
})

module.exports = BelongsToMany
