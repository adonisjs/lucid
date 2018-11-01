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

const EagerLoad = require('../EagerLoad')
const RelationsParser = require('../Relations/Parser')
const CE = require('../../Exceptions')

const proxyGet = require('../../../lib/proxyGet')
const util = require('../../../lib/util')
const { ioc } = require('../../../lib/iocResolver')

const proxyHandler = {
  get: proxyGet('query', false, function (target, name) {
    const queryScope = util.makeScopeName(name)

    if (name === 'then') {
      throw new Error(`Make sure to call fetch to execute the query`)
    }

    /**
     * if value is a local query scope and a function, please
     * execute it
     */
    if (typeof (target.Model[queryScope]) === 'function') {
      return function (...args) {
        target.Model[queryScope](this, ...args)
        return this
      }
    }
  })
}

/**
 * Aggregrates to be added to the query
 * builder
 */
const aggregates = [
  'sum',
  'sumDistinct',
  'avg',
  'avgDistinct',
  'min',
  'max',
  'count',
  'countDistinct',
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
 * Query methods to be added to the
 * query builder
 */
const queryMethods = [
  'pluck',
  'toSQL',
  'increment',
  'decrement',
  'toString'
]

/**
 * Query builder for the lucid models extended
 * by the @ref('Database') class.
 *
 * @class QueryBuilder
 * @constructor
 */
class QueryBuilder {
  constructor (Model, connection) {
    this.Model = Model
    this.connectionString = connection

    const table = this.Model.prefix ? `${this.Model.prefix}${this.Model.table}` : this.Model.table

    /**
     * Reference to database provider
     */
    this.db = ioc.use('Adonis/Src/Database').connection(connection)

    /**
     * Reference to query builder with pre selected table
     */
    this.query = this.db.table(table)

    /**
     * SubQuery to be pulled off the query builder. For now this is
     * passed to the `where` closure.
     */
    this.query.subQuery = () => {
      return this.Model.queryWithOutScopes()
    }

    /**
     * Relations to be eagerloaded
     *
     * @type {Object}
     */
    this._eagerLoads = {}

    /**
     * The sideloaded data for this query
     *
     * @type {Array}
     */
    this._sideLoaded = []

    /**
     * Query level visible fields
     *
     * @type {Array}
     */
    this._visibleFields = this.Model.visible

    /**
     * Query level hidden fields
     *
     * @type {Array}
     */
    this._hiddenFields = this.Model.hidden

    /**
     * Storing the counter for how many withCount queries
     * have been made by this query builder chain.
     *
     * This is required so that self joins have generate
     * unique table names
     *
     * @type {Number}
     */
    this._withCountCounter = -1

    /**
     * Reference to the global scopes iterator. A fresh instance
     * needs to be used for each query
     */
    this.scopesIterator = this.Model.$globalScopes.iterator()

    return new Proxy(this, proxyHandler)
  }

  /**
   * Makes a whereExists query on the parent model by
   * checking the relationships existence with a
   * relationship
   *
   * @method _has
   *
   * @param  {String}   relation
   * @param  {String}   method
   * @param  {String}   expression
   * @param  {Mixed}    value
   * @param  {String}   rawWhere
   * @param  {Function} callback
   *
   * @return {Boolean}
   *
   * @private
   */
  _has (relationInstance, method, expression, value, rawWhere, callback) {
    if (typeof (callback) === 'function') {
      callback(relationInstance)
    }

    if (expression && value) {
      const countSql = relationInstance.relatedWhere(true).toSQL()
      this.query[rawWhere](`(${countSql.sql}) ${expression} ?`, countSql.bindings.concat([value]))
    } else {
      this.query[method](relationInstance.relatedWhere())
    }

    relationInstance.applyRelatedScopes()
  }

  /**
   * Parses the relation string passed to `has`, `whereHas`
   * methods and returns the relationship instance with
   * nested relations (if any)
   *
   * @method _parseRelation
   *
   * @param  {String}       relation
   *
   * @return {Object}
   *
   * @private
   */
  _parseRelation (relation) {
    const { name, nested } = RelationsParser.parseRelation(relation)
    RelationsParser.validateRelationExistence(this.Model.prototype, name)
    const relationInstance = RelationsParser.getRelatedInstance(this.Model.prototype, name)
    return { relationInstance, nested, name }
  }

  /**
   * This method will apply all the global query scopes
   * to the query builder
   *
   * @method applyScopes
   *
   * @private
   */
  _applyScopes () {
    this.scopesIterator.execute(this)
    return this
  }

  /**
   * Maps all rows to model instances
   *
   * @method _mapRowsToInstances
   *
   * @param  {Array}            rows
   *
   * @return {Array}
   *
   * @private
   */
  _mapRowsToInstances (rows) {
    return rows.map((row) => this._mapRowToInstance(row))
  }

  /**
   * Maps a single row to model instance
   *
   * @method _mapRowToInstance
   *
   * @param  {Object}          row
   *
   * @return {Model}
   */
  _mapRowToInstance (row) {
    const modelInstance = new this.Model()

    /**
     * The omitBy function is used to remove sideLoaded data
     * from the actual values and set them as $sideLoaded
     * property on models
     */
    modelInstance.newUp(_.omitBy(row, (value, field) => {
      if (this._sideLoaded.indexOf(field) > -1) {
        modelInstance.$sideLoaded[field] = value
        return true
      }

      modelInstance.$visible = this._visibleFields
      modelInstance.$hidden = this._hiddenFields
    }))

    return modelInstance
  }

  /**
   * Eagerload relations for all model instances
   *
   * @method _eagerLoad
   *
   * @param  {Array}   modelInstance
   *
   * @return {void}
   *
   * @private
   */
  async _eagerLoad (modelInstances) {
    if (_.size(modelInstances)) {
      await new EagerLoad(this._eagerLoads).load(modelInstances)
    }
  }

  /**
   * Access of query formatter
   *
   * @method formatter
   *
   * @return {Object}
   */
  formatter () {
    return this.query.client.formatter(this.query)
  }

  /**
   * Instruct query builder to ignore all global
   * scopes.
   *
   * Passing `*` will ignore all scopes or you can
   * pass an array of scope names.
   *
   * @param {Array} [scopes = ['*']]
   *
   * @method ignoreScopes
   *
   * @chainable
   */
  ignoreScopes (scopes) {
    this.scopesIterator.ignore(scopes)
    return this
  }

  /**
   * Execute the query builder chain by applying global scopes
   *
   * @method fetch
   * @async
   *
   * @return {Serializer} Instance of model serializer
   */
  async fetch () {
    /**
     * Apply all the scopes before fetching
     * data
     */
    this._applyScopes()

    /**
     * Execute query
     */
    const rows = await this.query

    /**
     * Convert to an array of model instances
     */
    const modelInstances = this._mapRowsToInstances(rows)
    await this._eagerLoad(modelInstances)

    /**
     * Fire afterFetch event
     */
    if (this.Model.$hooks) {
      await this.Model.$hooks.after.exec('fetch', modelInstances)
    }

    const Serializer = this.Model.resolveSerializer()
    return new Serializer(modelInstances)
  }

  /**
   * Returns the first row from the database.
   *
   * @method first
   * @async
   *
   * @return {Model|Null}
   */
  async first () {
    /**
     * Apply all the scopes before fetching
     * data
     */
    this._applyScopes()

    const row = await this.query.first()
    if (!row) {
      return null
    }

    const modelInstance = this._mapRowToInstance(row)
    await this._eagerLoad([modelInstance])

    if (this.Model.$hooks) {
      await this.Model.$hooks.after.exec('find', modelInstance)
    }

    return modelInstance
  }

  /**
   * Returns the latest row from the database.
   *
   * @method last
   * @async
   *
   * @param  {String} field
   *
   * @return {Model|Null}
   */
  async last (field = this.Model.primaryKey) {
    /**
     * Apply all the scopes before fetching
     * data
     */
    this._applyScopes()

    const row = await this.query.orderBy(field, 'desc').first()
    if (!row) {
      return null
    }

    const modelInstance = this._mapRowToInstance(row)

    /**
     * Eagerload relations when defined on query
     */
    if (_.size(this._eagerLoads)) {
      await modelInstance.loadMany(this._eagerLoads)
    }

    if (this.Model.$hooks) {
      await this.Model.$hooks.after.exec('find', modelInstance)
    }

    return modelInstance
  }

  /**
   * Throws an exception when unable to find the first
   * row for the built query
   *
   * @method firstOrFail
   * @async
   *
   * @return {Model}
   *
   * @throws {ModelNotFoundException} If unable to find first row
   */
  async firstOrFail () {
    const returnValue = await this.first()
    if (!returnValue) {
      throw CE.ModelNotFoundException.raise(this.Model.name)
    }

    return returnValue
  }

  /**
   * Paginate records, same as fetch but returns a
   * collection with pagination info
   *
   * @method paginate
   * @async
   *
   * @param  {Number} [page = 1]
   * @param  {Number} [limit = 20]
   *
   * @return {Serializer}
   */
  async paginate (page = 1, limit = 20) {
    /**
     * Apply all the scopes before fetching
     * data
     */
    this._applyScopes()
    const result = await this.query.paginate(page, limit)

    /**
     * Convert to an array of model instances
     */
    const modelInstances = this._mapRowsToInstances(result.data)
    await this._eagerLoad(modelInstances)

    /**
     * Pagination meta data
     */
    const pages = _.omit(result, ['data'])

    /**
     * Fire afterPaginate event
     */
    if (this.Model.$hooks) {
      await this.Model.$hooks.after.exec('paginate', modelInstances, pages)
    }

    /**
     * Return an instance of active model serializer
     */
    const Serializer = this.Model.resolveSerializer()
    return new Serializer(modelInstances, pages)
  }

  /**
   * Execute insert query
   *
   * @method insert
   *
   * @param  {Object} attributes
   *
   * @return {Array}
   */
  async insert (attributes) {
    return this.query.insert(attributes)
  }

  /**
   * Bulk update data from query builder. This method will also
   * format all dates and set `updated_at` column
   *
   * @method update
   * @async
   *
   * @param  {Object|Model} valuesOrModelInstance
   *
   * @return {Promise}
   */
  update (valuesOrModelInstance) {
    /**
     * If update receives the model instance, then it just picks the dirty
     * fields and updates them
     */
    if (valuesOrModelInstance && valuesOrModelInstance instanceof this.Model === true) {
      this._applyScopes()
      return this.query.update(valuesOrModelInstance.dirty)
    }

    const valuesCopy = _.clone(valuesOrModelInstance)
    const fakeModel = new this.Model()
    fakeModel._setUpdatedAt(valuesCopy)
    fakeModel._formatDateFields(valuesCopy)

    /**
     * Apply all the scopes before update
     */
    this._applyScopes()
    return this.query.update(valuesCopy)
  }

  /**
   * Deletes the rows from the database.
   *
   * @method delete
   * @async
   *
   * @return {Promise}
   */
  delete () {
    this._applyScopes()
    return this.query.delete()
  }

  /**
   * Remove everything from table
   *
   * @method truncate
   *
   * @return {Number}
   */
  truncate () {
    return this.query.truncate()
  }

  /**
   * Returns an array of primaryKeys
   *
   * @method ids
   * @async
   *
   * @return {Array}
   */
  ids () {
    return this.pluck(this.Model.primaryKey)
  }

  /**
   * Returns a pair of lhs and rhs. This method will not
   * eagerload relationships.
   *
   * @method pair
   * @async
   *
   * @param  {String} lhs
   * @param  {String} rhs
   *
   * @return {Object}
   */
  async pair (lhs, rhs) {
    this._applyScopes()

    const rows = await this.query
    return _.transform(rows, (result, row) => {
      result[row[lhs]] = row[rhs]
      return result
    }, {})
  }

  /**
   * Same as `pick` but inverse
   *
   * @method pickInverse
   * @async
   *
   * @param  {Number}    [limit = 1]
   *
   * @return {Collection}
   */
  pickInverse (limit = 1) {
    this.query.orderBy(this.Model.primaryKey, 'desc').limit(limit)
    return this.fetch()
  }

  /**
   * Pick x number of rows from the database
   *
   * @method pick
   * @async
   *
   * @param  {Number} [limit = 1]
   *
   * @return {Collection}
   */
  pick (limit = 1) {
    this.query.orderBy(this.Model.primaryKey, 'asc').limit(limit)
    return this.fetch()
  }

  /**
   * Eagerload relationships when fetching the parent
   * record
   *
   * @method with
   *
   * @param  {String}   relation
   * @param  {Function} [callback]
   *
   * @chainable
   */
  with (relation, callback) {
    this._eagerLoads[relation] = callback
    return this
  }

  /**
   * Adds a check on there parent model to fetch rows
   * only where related rows exists or as per the
   * defined number
   *
   * @method has
   *
   * @param  {String}  relation
   * @param  {String}  expression
   * @param  {Mixed}   value
   *
   * @chainable
   */
  has (relation, expression, value) {
    const { relationInstance, nested } = this._parseRelation(relation)

    if (nested) {
      relationInstance.has(_.first(_.keys(nested)), expression, value)
      this._has(relationInstance, 'whereExists')
    } else {
      this._has(relationInstance, 'whereExists', expression, value, 'whereRaw')
    }

    return this
  }

  /**
   * Similar to `has` but instead adds or clause
   *
   * @method orHas
   *
   * @param  {String} relation
   * @param  {String} expression
   * @param  {Mixed} value
   *
   * @chainable
   */
  orHas (relation, expression, value) {
    const { relationInstance, nested } = this._parseRelation(relation)

    if (nested) {
      relationInstance.orHas(_.first(_.keys(nested)), expression, value)
      this._has(relationInstance, 'orWhereExists')
    } else {
      this._has(relationInstance, 'orWhereExists', expression, value, 'orWhereRaw')
    }

    return this
  }

  /**
   * Adds a check on the parent model to fetch rows where
   * related rows doesn't exists
   *
   * @method doesntHave
   *
   * @param  {String}   relation
   *
   * @chainable
   */
  doesntHave (relation) {
    const { relationInstance, nested } = this._parseRelation(relation)

    if (nested) {
      relationInstance.doesntHave(_.first(_.keys(nested)))
    }

    this._has(relationInstance, 'whereNotExists')
    return this
  }

  /**
   * Same as `doesntHave` but adds a `or` clause.
   *
   * @method orDoesntHave
   *
   * @param  {String}   relation
   *
   * @chainable
   */
  orDoesntHave (relation) {
    const { relationInstance, nested } = this._parseRelation(relation)

    if (nested) {
      relationInstance.orDoesntHave(_.first(_.keys(nested)))
    }

    this._has(relationInstance, 'orWhereNotExists')
    return this
  }

  /**
   * Adds a query constraint just like has but gives you
   * a chance to pass a callback to add more constraints
   *
   * @method whereHas
   *
   * @param  {String}   relation
   * @param  {Function} callback
   * @param  {String}   expression
   * @param  {String}   value
   *
   * @chainable
   */
  whereHas (relation, callback, expression, value) {
    const { relationInstance, nested } = this._parseRelation(relation)

    if (nested) {
      relationInstance.whereHas(_.first(_.keys(nested)), callback, expression, value)
      this._has(relationInstance, 'whereExists')
    } else {
      this._has(relationInstance, 'whereExists', expression, value, 'whereRaw', callback)
    }

    return this
  }

  /**
   * Same as `whereHas` but with `or` clause
   *
   * @method orWhereHas
   *
   * @param  {String}   relation
   * @param  {Function} callback
   * @param  {String}   expression
   * @param  {Mixed}   value
   *
   * @chainable
   */
  orWhereHas (relation, callback, expression, value) {
    const { relationInstance, nested } = this._parseRelation(relation)

    if (nested) {
      relationInstance.orWhereHas(_.first(_.keys(nested)), callback, expression, value)
      this._has(relationInstance, 'orWhereExists')
    } else {
      this._has(relationInstance, 'orWhereExists', expression, value, 'orWhereRaw', callback)
    }

    return this
  }

  /**
   * Opposite of `whereHas`
   *
   * @method whereDoesntHave
   *
   * @param  {String}        relation
   * @param  {Function}      callback
   *
   * @chainable
   */
  whereDoesntHave (relation, callback) {
    const { relationInstance, nested } = this._parseRelation(relation)

    if (nested) {
      relationInstance.whereDoesntHave(_.first(_.keys(nested)), callback)
      this._has(relationInstance, 'whereNotExists')
    } else {
      this._has(relationInstance, 'whereNotExists', null, null, null, callback)
    }

    return this
  }

  /**
   * Same as `whereDoesntHave` but with `or` clause
   *
   * @method orWhereDoesntHave
   *
   * @param  {String}          relation
   * @param  {Function}        callback
   *
   * @chainable
   */
  orWhereDoesntHave (relation, callback) {
    const { relationInstance, nested } = this._parseRelation(relation)

    if (nested) {
      relationInstance.orWhereDoesntHave(_.first(_.keys(nested)), callback)
      this._has(relationInstance, 'orWhereNotExists')
    } else {
      this._has(relationInstance, 'orWhereNotExists', null, null, null, callback)
    }

    return this
  }

  /**
   * Returns count of a relationship
   *
   * @method withCount
   *
   * @param  {String}   relation
   * @param  {Function} callback
   *
   * @chainable
   *
   * @example
   * ```js
   * query().withCount('profile')
   * query().withCount('profile as userProfile')
   * ```
   */
  withCount (relation, callback) {
    let { name, nested } = RelationsParser.parseRelation(relation)
    if (nested) {
      throw CE.RuntimeException.cannotNestRelation(_.first(_.keys(nested)), name, 'withCount')
    }

    this._withCountCounter++

    /**
     * Since user can set the `count as` statement, we need
     * to parse them properly.
     */
    const tokens = name.match(/as\s(\w+)/)
    let asStatement = `${name}_count`
    if (_.size(tokens)) {
      asStatement = tokens[1]
      name = name.replace(tokens[0], '').trim()
    }

    RelationsParser.validateRelationExistence(this.Model.prototype, name)
    const relationInstance = RelationsParser.getRelatedInstance(this.Model.prototype, name)

    /**
     * Call the callback with relationship instance
     * when callback is defined
     */
    if (typeof (callback) === 'function') {
      callback(relationInstance)
    }

    const columns = []

    /**
     * Add `*` to columns only when there are no existing columns selected
     */
    if (!_.find(this.query._statements, (statement) => statement.grouping === 'columns')) {
      columns.push('*')
    }

    columns.push(relationInstance.relatedWhere(true, this._withCountCounter).as(asStatement))

    /**
     * Saving reference of count inside _sideloaded
     * so that we can set them later to the
     * model.$sideLoaded
     */
    this._sideLoaded.push(asStatement)

    /**
     * Clear previously selected columns and set new
     */
    this.query.select(columns)

    relationInstance.applyRelatedScopes()

    return this
  }

  /**
   * Define fields to be visible for a single
   * query.
   *
   * Computed when `toJSON` is called
   *
   * @method setVisible
   *
   * @param  {Array}   fields
   *
   * @chainable
   */
  setVisible (fields) {
    this._visibleFields = fields
    return this
  }

  /**
   * Define fields to be hidden for a single
   * query.
   *
   * Computed when `toJSON` is called
   *
   * @method setHidden
   *
   * @param  {Array}   fields
   *
   * @chainable
   */
  setHidden (fields) {
    this._hiddenFields = fields
    return this
  }

  /**
   * Create a clone of Query builder
   *
   * @method clone
   *
   * @return {QueryBuilde}
   */
  clone () {
    const clonedQuery = new QueryBuilder(this.Model, this.connectionString)
    clonedQuery.query = this.query.clone()
    clonedQuery.query.subQuery = this.query.subQuery

    clonedQuery._eagerLoads = this._eagerLoads
    clonedQuery._sideLoaded = this._sideLoaded
    clonedQuery._visibleFields = this._visibleFields
    clonedQuery._hiddenFields = this._hiddenFields
    clonedQuery._withCountCounter = this._withCountCounter
    clonedQuery.scopesIterator = this.scopesIterator

    return clonedQuery
  }
}

aggregates.concat(queryMethods).forEach((method) => {
  QueryBuilder.prototype[method] = function (...args) {
    this._applyScopes()
    return this.query[method](...args)
  }
})

module.exports = QueryBuilder
