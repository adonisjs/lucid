'use strict'

/**
 * adonis-framework
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
const _emitSql = function (query) {
  const hrstart = new Date()
  const sql = this.client.SqlString.format(query.sql, query.bindings, query.tz)
  this.once('start', (builder) => {
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
 * @method _setConfigProvider. It is set while registering
 * it inside the IOC container. So no one will ever to
 * deal with it manaully.
 *
 * @param  {Object}           Config
 *
 * @private
 */
Database._setConfigProvider = function (Config) {
  ConfigProvider = Config
}

/**
 * returns configuration for a given connection name
 *
 * @method getConfig
 * @param  {String}  connection
 * @return {Object}
 *
 * @private
 */
Database._getConfig = function (connection) {
  if (connection === 'default') {
    connection = ConfigProvider.get('database.connection')
    if (!connection) {
      throw new Error('connection is not defined inside database config file')
    }
  }
  return ConfigProvider.get(`database.${connection}`)
}

/**
 * returns knex instance for a given connection
 * if it exists it's fine, otherwise a pool is created and
 * returned
 *
 * @method getConnection
 * @param  {String}      connection
 * @return {Object}
 *
 * @private
 */
Database._getConnection = function (connection) {
  if (!connectionPools[connection]) {
    const config = Database._getConfig(connection)
    if (!config) {
      throw new Error(`Unable to get database client configuration using ${connection} key`)
    }
    const client = knex(config)
    const rawTransaction = client.transaction
    client.transaction = Database.transaction(rawTransaction)
    client.on('query', _emitSql)
    client.beginTransaction = Database.beginTransaction(rawTransaction)
    client.client.QueryBuilder.prototype.forPage = Database.forPage
    client.client.QueryBuilder.prototype.paginate = Database.paginate
    client.client.QueryBuilder.prototype.chunk = Database.chunk
    connectionPools[connection] = client
  }
  return connectionPools[connection]
}

/**
 * creates a connection pool for a given connection
 * if does not exists and returns the knex instance
 * for a given connection defined inside database
 * config file.
 *
 * @method connection
 * @param  {String}   connection Name of the connection to return pool
 *                               instance for
 * @return {Object}
 *
 * @example
 * Database.connection('mysql')
 * Database.connection('sqlite')
 *
 * @public
 */
Database.connection = function (connection) {
  return Database._getConnection(connection)
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
 * @param {String} [connection] connection name to close, if not provided all
 *                              connections will get closed.
 * @return {void}
 *
 * @public
 */
Database.close = function (connection) {
  if (connection && connectionPools[connection]) {
    connectionPools[connection].client.destroy()
    delete connectionPools[connection]
    return
  }

  const poolKeys = Object.keys(connectionPools)
  poolKeys.forEach(function (key) {
    connectionPools[key].client.destroy()
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
 * @return {Array}
 *
 * @example
 * Database.table('users').paginate(1)
 * Database.table('users').paginate(1, 30)
 *
 * @public
 */
Database.paginate = function * (page, perPage) {
  perPage = perPage || 20
  util.validatePage(page)
  /**
   * first we count the total rows before making the actual
   * actual for getting results
   */
  const queryClone = this.clone()
  const count = yield queryClone.count('* as total')
  if (!count[0] || parseInt(count[0].total, 10) === 0) {
    return util.makePaginateMeta(0, page, perPage)
  }

  /**
   * here we fetch results and set meta data for paginated
   * results
   */
  const results = yield this.forPage(page, perPage)
  const resultSet = util.makePaginateMeta(parseInt(count[0].total, 10), page, perPage)
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
const methodsNotToProxy = ['_getConfig', '_setConfigProvider', 'getConnectionPools', 'connection', 'close']

/**
 * Proxy handler to proxy methods and send
 * them to knex directly.
 *
 * @type {Object}
 *
 * @private
 */
const DatabaseProxy = {
  get: function (target, method) {
    if (methodsNotToProxy.indexOf(method) > -1) {
      return target[method]
    }
    return Database._getConnection('default')[method]
  }
}

module.exports = new Proxy(Database, DatabaseProxy)
