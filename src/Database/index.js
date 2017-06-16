'use strict'

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
    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    const queryBuilder = target.query()
    if (typeof (queryBuilder[name]) !== 'function') {
      throw new Error(`Database.${name} is not a function`)
    }

    if (target._globalTrx) {
      queryBuilder.transacting(target._globalTrx)
    }
    return queryBuilder[name].bind(queryBuilder)
  }
}

/**
 * Database class instance is used to initiate database
 * queries and transactions.
 *
 * @class Database
 * @constructor
 */
class Database {
  constructor (config) {
    if (config.client === 'sqlite') {
      config.useNullAsDefault = _.defaultTo(config.useNullAsDefault, true)
    }
    this.knex = knex(config)
    this._globalTrx = null
    return new Proxy(this, proxyHandler)
  }

  /**
   * Returns the schema builder
   *
   * @attribute schema
   *
   * @return {Object}
   */
  get schema () {
    return this.knex.schema
  }

  /**
   * Method to build raw queries
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
   *
   * @return {Promise}
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
   *
   * @return {void}
   */
  async beginGlobalTransaction () {
    this._globalTrx = await this.beginTransaction()
  }

  /**
   * Rollbacks global transaction
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
   * Commits global transaction
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
    return new this.knex.queryBuilder()
  }

  /**
   * Closes the database connection. No more queries
   * can be made after this
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
