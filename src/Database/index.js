'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * to have stable support for proxies
 * we need harmony-reflect
 */
require('harmony-reflect')

const knex = require('knex')
const util = require('../../lib/util')
const co = require('co')
const CE = require('../Exceptions')
const _ = require('lodash')

/**
 * here we store connection pools, created by database provider. It is
 * required to re-use old connections as database provider has support
 * for using multiple connections on runtime, and spwaning a new
 * connection everytime will blow up things.
 *
 *
 * @type {Object}
 *
 * @private
 */
let connectionPools = {}

/**
 * reference to config provider, since we do
 * not require providers and instead get
 * them from IOC container.
 *
 * @type {Object}
 *
 * @private
 */
let ConfigProvider = {}

/**
 * emits sql event on query builder instance with
 * formatted sql statement and time taken by a
 * given query.
 *
 * @method emitSql
 *
 * @param  {Object} query
 *
 * @private
 */
const _emitSql = function (builder) {
  const hrstart = process.hrtime()
  builder.once('query', (query) => {
    const sql = this.client.SqlString.format(query.sql, query.bindings, query.tz)
    builder.once('end', () => {
      this.emit('sql', `+ ${util.timeDiff(hrstart)} : ${sql}`)
    })
  })
}

/**
 * Database provider to build sql queries
 * @module Database
 */
const Database = {}

/**
 * sets the config provider for database module
 * It is set while registering it inside the
 * IOC container. So no one will ever to
 * deal with it manaully.
 *
 * @method _setConfigProvider.
 *
 * @param  {Object}           Config
 *
 * @private
 */
Database._setConfigProvider = function (Config) {
  ConfigProvider = Config
}

/**
 * Resolves a connection key to be used for fetching database
 * connection config. If key is defined to default, it
 * will make use the value defined next to
 * database.connection key.
 *
 * @method _resolveConnectionKey
 *
 * @param  {String}  connection
 * @return {Object}
 *
 * @private
 */
Database._resolveConnectionKey = function (connection) {
  if (connection === 'default') {
    connection = ConfigProvider.get('database.connection')
    if (!connection) {
      throw CE.InvalidArgumentException.missingConfig('Make sure to define a connection inside the database config file')
    }
  }
  return connection
}

/**
 * returns knex instance for a given connection if it
 * does not exists, a pool is created and returned.
 *
 * @method connection
 *
 * @param  {String}      connection
 * @return {Object}
 *
 * @example
 * Database.connection('mysql')
 * Database.connection('sqlite')
 */
Database.connection = function (connection) {
  connection = Database._resolveConnectionKey(connection)

  if (!connectionPools[connection]) {
    const config = ConfigProvider.get(`database.${connection}`)
    if (!config) {
      throw CE.InvalidArgumentException.missingConfig(`Unable to get database client configuration for ${connection}`)
    }
    const client = knex(config)
    const rawTransaction = client.transaction
    /**
     * adding custom methods to the query builder
     */
    client.transaction = Database.transaction(rawTransaction)
    client.on('start', _emitSql)
    client.beginTransaction = Database.beginTransaction(rawTransaction)
    client.client.QueryBuilder.prototype.forPage = Database.forPage
    client.client.QueryBuilder.prototype.paginate = Database.paginate
    client.client.QueryBuilder.prototype.chunk = Database.chunk
    connectionPools[connection] = client
  }

  return connectionPools[connection]
}

/**
 * returns list of connection pools created
 * so far.
 *
 * @method getConnectionPools
 *
 * @return {Object}
 * @public
 */
Database.getConnectionPools = function () {
  return connectionPools
}

/**
 * closes database connection by destroying the client
 * and remove it from the pool.
 *
 * @method close
 *
 * @param {String} [connection] name of the connection to close, if not provided
 *                               all connections will get closed.
 * @return {void}
 *
 * @public
 */
Database.close = function (connection) {
  connection = connection ? Database._resolveConnectionKey(connection) : null
  if (connection && connectionPools[connection]) {
    connectionPools[connection].client.destroy()
    delete connectionPools[connection]
    return
  }

  _.each(connectionPools, (pool) => {
    pool.client.destroy()
  })
  connectionPools = {}
}

/**
 * beginTransaction is used for doing manual commit and
 * rollback. Errors emitted from this method are voided.
 *
 * @method beginTransaction
 *
 * @param  {Function}    clientTransaction original transaction method from knex instance
 * @return {Function}
 *
 * @example
 * const trx = yield Database.beginTransaction()
 * yield Database.table('users').transacting(trx)
 * trx.commit()
 * trx.rollback()
 *
 * @public
 */
Database.beginTransaction = function (clientTransaction) {
  return function () {
    return new Promise(function (resolve, reject) {
      clientTransaction(function (trx) {
        resolve(trx)
      })
      .catch(function () {
        /**
         * adding a dummy handler to avoid exceptions from getting thrown
         * as this method does not need a handler
         */
      })
    })
  }
}

/**
 * overrides the actual transaction method on knex
 * to have a transaction method with support for
 * generator methods
 * @method transaction
 * @param  {Function}    clientTransaction original transaction method from knex instance
 * @return {Function}
 *
 * @example
 * Database.transaction(function * (trx) {
 *   yield trx.table('users')
 * })
 *
 * @public
 */
Database.transaction = function (clientTransaction) {
  return function (cb) {
    return clientTransaction(function (trx) {
      co(function * () {
        return yield cb(trx)
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
  }
}

/**
 * sets offset and limit on query chain using
 * current page and perpage params
 *
 * @method forPage
 *
 * @param  {Number} page
 * @param  {Number} [perPage=20]
 * @return {Object}
 *
 * @example
 * Database.table('users').forPage(1)
 * Database.table('users').forPage(1, 30)
 *
 * @public
 */
Database.forPage = function (page, perPage) {
  util.validatePage(page)
  perPage = perPage || 20
  const offset = util.returnOffset(page, perPage)
  return this.offset(offset).limit(perPage)
}

/**
 * gives paginated results for a given
 * query.
 *
 * @method paginate
 *
 * @param  {Number} page
 * @param  {Number} [perPage=20]
 * @param  {Object} [countByQuery]
 * @return {Array}
 *
 * @example
 * Database.table('users').paginate(1)
 * Database.table('users').paginate(1, 30)
 *
 * @public
 */
Database.paginate = function * (page, perPage, countByQuery) {
  const parsedPerPage = _.toSafeInteger(perPage) || 20
  const parsedPage = _.toSafeInteger(page)
  util.validatePage(parsedPage)
  /**
   * first we count the total rows before making the actual
   * query for getting results
   */
  countByQuery = countByQuery || this.clone().count('* as total')
  const count = yield countByQuery
  if (!count[0] || parseInt(count[0].total, 10) === 0) {
    return util.makePaginateMeta(0, parsedPage, parsedPerPage)
  }

  /**
   * here we fetch results and set meta data for paginated
   * results
   */
  const results = yield this.forPage(parsedPage, parsedPerPage)
  const resultSet = util.makePaginateMeta(parseInt(count[0].total, 10), parsedPage, parsedPerPage)
  resultSet.data = results
  return resultSet
}

/**
 * returns chunk of data under a defined limit of results, and
 * invokes a callback, everytime there are results.
 *
 * @method *chunk
 *
 * @param  {Number}   limit
 * @param  {Function} cb
 * @param  {Number}   [page=1]
 *
 * @example
 * Database.table('users').chunk(200, function (users) {
 *
 * })
 *
 * @public
 */
Database.chunk = function * (limit, cb, page) {
  page = page || 1
  const result = yield this.forPage(page, limit)
  if (result.length) {
    cb(result)
    page++
    yield this.chunk(limit, cb, page)
  }
}

/**
 * these methods are not proxied and instead actual implementations
 * are returned
 *
 * @type {Array}
 *
 * @private
 */
const customImplementations = ['_resolveConnectionKey', '_setConfigProvider', 'getConnectionPools', 'connection', 'close']

/**
 * Proxy handler to proxy methods and send
 * them to knex directly.
 *
 * @type {Object}
 *
 * @private
 */
const DatabaseProxy = {
  get: function (target, name) {
    if (customImplementations.indexOf(name) > -1) {
      return target[name]
    }
    return Database.connection('default')[name]
  }
}

module.exports = new Proxy(Database, DatabaseProxy)
