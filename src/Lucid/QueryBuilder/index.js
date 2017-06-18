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
    return new Proxy(this, proxyHandler)
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
    const collection = rows.map((row) => {
      const modelInstance = new this.model()
      modelInstance.newUp(row)
      return modelInstance
    })

    /**
     * Return an instance of active model serializer
     */
    return new this.model.serializer(collection)
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
}

module.exports = QueryBuilder
