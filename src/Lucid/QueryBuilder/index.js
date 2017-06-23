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

const proxyHandler = {
  get (target, name) {
    if (target[name]) {
      return target[name]
    }

    /**
     * If property accessed is a local query scope
     * then call it
     */
    const queryScope = util.makeScopeName(name)
    if (typeof (target.model[queryScope]) === 'function') {
      return function (...args) {
        target.model[queryScope](this, ...args)
        return this
      }
    }

    return target.query[name]
  }
}

class QueryBuilder {
  constructor (model, connection) {
    this.model = model
    this.db = ioc.use('Adonis/Src/Database').connection(connection)
    const table = this.model.prefix ? `${this.model.prefix}${this.model.table}` : this.model.table
    this.query = this.db.table(table).on('query', this.model._executeListeners.bind(this.model))
    this._ignoreScopes = []
    this._eagerLoads = {}
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
    return { relationInstance, nested }
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
    if (!_.size(scopes) || !_.isArray(scopes)) {
      return this
    }

    this._ignoreScopes = this._ignoreScopes.concat(scopes)
    return this
  }

  /**
   * This method will apply all the global query scopes
   * to the query builder
   *
   * @method applyScopes
   *
   * @chainable
   */
  applyScopes () {
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
    this.applyScopes()

    /**
     * Execute query
     */
    const rows = await this.query

    /**
     * Convert to an array of model instances
     */
    const modelInstances = rows.map((row) => {
      const modelInstance = new this.model()
      modelInstance.newUp(row)
      return modelInstance
    })

    if (_.size(modelInstances)) {
      await new EagerLoad(this._eagerLoads).load(modelInstances)
    }

    /**
     * Return an instance of active model serializer
     */
    return new this.model.serializer(modelInstances)
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
    this.model.setUpdatedAt(values)

    /**
     * Apply all the scopes before update
     * data
     */
    this.applyScopes()
    return this.query.update(this.model.formatDates(values))
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
    this.applyScopes()

    const result = await this.query.first()
    if (!result) {
      return null
    }

    const modelInstance = new this.model()
    modelInstance.newUp(result)
    this.model.$hooks.after.exec('find', modelInstance)
    return modelInstance
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
      result[row.$attributes[lhs]] = row.$attributes[rhs]
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
}

module.exports = QueryBuilder
