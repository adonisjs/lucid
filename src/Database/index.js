/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const knex = require('knex')
const _ = require('lodash')

const proxyHandler = {
  get (target, name) {
    if (typeof (name) === 'symbol' || name === 'inspect') {
      return target[name]
    }

    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    const queryBuilder = target.query()
    if (typeof (queryBuilder[name]) !== 'function') {
      throw new Error(`Database.${name} is not a function`)
    }

    /**
     * Attach transacting to all the database
     * queries if global transactions are on
     */
    if (target._globalTrx) {
      queryBuilder.transacting(target._globalTrx)
    }

    return queryBuilder[name].bind(queryBuilder)
  }
}

/**
 * The database class is a reference to knex for a single
 * connection. It has couple of extra methods over knex.
 *
 * Note: You don't instantiate this class directly but instead
 * make use of @ref('DatabaseManager')
 *
 * @class Database
 * @constructor
 * @group Database
 */
class Database {
  constructor (config) {
    if (config.client === 'sqlite' || config.client === 'sqlite3') {
      config.useNullAsDefault = _.defaultTo(config.useNullAsDefault, true)
    }
    this.knex = knex(config)
    this._globalTrx = null
    return new Proxy(this, proxyHandler)
  }

  /**
   * Bind listeners for database events. Which are
   * `query`, `query-error`, `query-response` and
   * `sql`
   *
   * @method on
   *
   * @param  {Strign}   event
   * @param  {Function} callback
   *
   * @chainable
   */
  on (event, callback) {
    this.knex.on(event, callback)
    return this
  }

  /**
   * The schema builder instance to be used
   * for creating database schema.
   *
   * You should obtain a new schema instance for every
   * database operation and should never use stale
   * instances. For example
   *
   * @example
   * ```js
   * // WRONG
   * const schema = Database.schema
   * schema.createTable('users')
   * schema.createTable('profiles')
   * ```
   *
   * ```js
   * // RIGHT
   * Database.schema.createTable('users')
   * Database.schema.createTable('profiles')
   * ```
   *
   * @attribute schema
   *
   * @return {Object}
   */
  get schema () {
    return this.knex.schema
  }

  /**
   * Returns the fn from knex instance
   *
   * @method fn
   *
   * @return {Object}
   */
  get fn () {
    return this.knex.fn
  }

  /**
   * Method to construct raw database queries.
   *
   * @method raw
   *
   * @param  {...Spread} args
   *
   * @return {String}
   */
  raw (...args) {
    return this.knex.raw(...args)
  }

  /**
   * Returns a trx object to be used for running queries
   * under transaction.
   *
   * @method beginTransaction
   * @async
   *
   * @return {Object}
   *
   * @example
   * ```js
   * const trx = await Database.beginTransaction()
   * await trx
   *   .table('users')
   *   .insert({ username: 'virk' })
   *
   * // or
   * Database
   *   .table('users')
   *   .transacting(trx)
   *   .insert({ username: 'virk' })
   * ```
   */
  beginTransaction () {
    return new Promise((resolve, reject) => {
      this
        .knex
        .transaction(function (trx) {
          resolve(trx)
        }).catch(() => {})
    })
  }

  /**
   * Starts a global transaction, where all query builder
   * methods will be part of transaction automatically.
   *
   * Note: You must not use it in real world apart from when
   * writing tests.
   *
   * @method beginGlobalTransaction
   * @async
   *
   * @return {void}
   */
  async beginGlobalTransaction () {
    this._globalTrx = await this.beginTransaction()
  }

  /**
   * Rollbacks global transaction.
   *
   * @method rollbackGlobalTransaction
   *
   * @return {void}
   */
  rollbackGlobalTransaction () {
    this._globalTrx.rollback()
    this._globalTrx = null
  }

  /**
   * Commits global transaction.
   *
   * @method commitGlobalTransaction
   *
   * @return {void}
   */
  commitGlobalTransaction () {
    this._globalTrx.commit()
    this._globalTrx = null
  }

  /**
   * Return a new instance of query builder
   *
   * @method query
   *
   * @return {Object}
   */
  query () {
    return this.knex.queryBuilder()
  }

  /**
   * Closes the database connection. No more queries
   * can be made after this.
   *
   * @method close
   *
   * @return {Promise}
   */
  close () {
    return this.knex.destroy()
  }
}

module.exports = Database
