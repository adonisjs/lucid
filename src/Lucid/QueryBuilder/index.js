'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('@adonisjs/fold')
const _ = require('lodash')
const util = require('../../../lib/util')
const EagerLoad = require('../EagerLoad')
const RelationsParser = require('../Relations/Parser')
const CE = require('../../Exceptions')
const proxyGet = require('../../../lib/proxyGet')

const proxyHandler = {
  get: proxyGet('query', false, function (target, name) {
    const queryScope = util.makeScopeName(name)

    /**
     * if value is a local query scope and a function, please
     * execute it
     */
    if (typeof (target.model[queryScope]) === 'function') {
      return function (...args) {
        target.model[queryScope](this, ...args)
        return this
      }
    }
  })
}

class QueryBuilder {
  constructor (model, connection) {
    this.model = model
    const table = this.model.prefix ? `${this.model.prefix}${this.model.table}` : this.model.table

    /**
     * Reference to database provider
     */
    this.db = ioc.use('Adonis/Src/Database').connection(connection)

    /**
     * Reference to query builder with pre selected table
     */
    this.query = this.db.table(table).on('query', this.model._executeListeners.bind(this.model))

    /**
     * Scopes to be ignored at runtime
     *
     * @type {Array}
     *
     * @private
     */
    this._ignoreScopes = []

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
    RelationsParser.validateRelationExistence(this.model.prototype, name)
    const relationInstance = RelationsParser.getRelatedInstance(this.model.prototype, name)
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
    if (this._ignoreScopes.indexOf('*') > -1) {
      return this
    }

    _(this.model.$globalScopes)
    .filter((scope) => this._ignoreScopes.indexOf(scope.name) <= -1)
    .each((scope) => {
      if (typeof (scope.callback) === 'function') {
        scope.callback(this)
      }
    })

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
    const modelInstance = new this.model()
    modelInstance.newUp(_.omitBy(row, (value, field) => {
      if (this._sideLoaded.indexOf(field) > -1) {
        modelInstance.$sideLoaded[field] = value
        return true
      }
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
   * Instruct query builder to ignore all global
   * scopes
   *
   * @method ignoreScopes
   *
   * @chainable
   */
  ignoreScopes (scopes = ['*']) {
    /**
     * Don't do anything when array is empty or value is not
     * an array
     */
    if (_.isArray(scopes) && _.size(scopes)) {
      this._ignoreScopes = this._ignoreScopes.concat(scopes)
    }

    return this
  }

  /**
   * Execute the query builder chain by applying global scopes
   *
   * @method fetch
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
     * Return an instance of active model serializer
     */
    return new this.model.serializer(modelInstances)
  }

  /**
   * Returns the first row from the database.
   *
   * @method first
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

    /**
     * Eagerload relations when defined on query
     */
    if (_.size(this._eagerLoads)) {
      await modelInstance.loadMany(this._eagerLoads)
    }

    this.model.$hooks.after.exec('find', modelInstance)
    return modelInstance
  }

  /**
   * Paginate records, same as fetch but returns a
   * collection with pagination info
   *
   * @method paginate
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
     * Return an instance of active model serializer
     */
    return new this.model.serializer(modelInstances, _.omit(result, ['data']))
  }

  /**
   * Bulk update data from query builder. This method will also
   * format all dates and set `updated_at` column
   *
   * @method update
   *
   * @param  {Object} values
   *
   * @return {Promise}
   */
  async update (values) {
    const valuesCopy = _.clone(values)
    const fakeModel = new this.model()
    fakeModel._setUpdatedAt(valuesCopy)
    fakeModel._formatDateFields(valuesCopy)

    /**
     * Apply all the scopes before update
     */
    this._applyScopes()
    return this.query.update(valuesCopy)
  }

  /**
   * Returns an array of primaryKeys
   *
   * @method ids
   *
   * @return {Array}
   */
  async ids () {
    const rows = await this.query
    return rows.map((row) => row[this.model.primaryKey])
  }

  /**
   * Returns a pair of lhs and rhs. This method will not
   * eagerload relationships.
   *
   * @method pair
   *
   * @param  {String} lhs
   * @param  {String} rhs
   *
   * @return {Object}
   */
  async pair (lhs, rhs) {
    const collection = await this.fetch()
    return _.transform(collection.rows, (result, row) => {
      result[row[lhs]] = row[rhs]
      return result
    }, {})
  }

  /**
   * Same as `pick` but inverse
   *
   * @method pickInverse
   *
   * @param  {Number}    [limit = 1]
   *
   * @return {Collection}
   */
  pickInverse (limit = 1) {
    this.query.orderBy(this.model.primaryKey, 'desc').limit(limit)
    return this.fetch()
  }

  /**
   * Pick x number of rows from the database
   *
   * @method pick
   *
   * @param  {Number} [limit = 1]
   *
   * @return {Collection}
   */
  pick (limit = 1) {
    this.query.orderBy(this.model.primaryKey, 'asc').limit(limit)
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

    RelationsParser.validateRelationExistence(this.model.prototype, name)
    const relationInstance = RelationsParser.getRelatedInstance(this.model.prototype, name)

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
    columns.push(relationInstance.relatedWhere(true).as(asStatement))

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

    return this
  }

  /**
   * Returns the sql representation of query
   *
   * @method toSQL
   *
   * @return {Object}
   */
  toSQL () {
    return this.query.toSQL()
  }

  /**
   * Returns string representation of query
   *
   * @method toString
   *
   * @return {String}
   */
  toString () {
    return this.query.toString()
  }
}

module.exports = QueryBuilder
