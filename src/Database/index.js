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
const QueryBuilder = require('knex/lib/query/builder')
const util = require('../../lib/util')
const co = require('co')
const CE = require('../Exceptions')
const _ = require('lodash')

/**
 * Database provider to build sql queries
 * @module Database
 */
const Database = {}

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
    const sql = this.client._formatQuery(query.sql, query.bindings, query.tz)
    builder.once('end', () => {
      this.emit('sql', `+ ${util.timeDiff(hrstart)} : ${sql}`)
    })
  })
}

/**
 * Following attributes should be removed from the
 * paginate count query since things like orderBy
 * is not required when fetching the count.
 *
 * @type {Array}
 */
const excludeAttrFromCount = ['order']

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
    if (!QueryBuilder.prototype.transaction) {
      QueryBuilder.prototype.transaction = Database.transaction(rawTransaction)
    }
    client.on('start', _emitSql)

    /**
     * Adding methods on the client if withoutPrefix or withPrefix
     * is called directly it will return the query builder.
     */
    client.withoutPrefix = function () {
      return new QueryBuilder(this.client).withoutPrefix()
    }
    client.withPrefix = function (prefix) {
      return new QueryBuilder(this.client).withPrefix(prefix)
    }
    client.transaction = Database.transaction(rawTransaction)
    client.beginTransaction = Database.beginTransaction(rawTransaction)
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

  /**
   * Filter unnecessary statements from the cloned query
   */
  countByQuery._statements = _.filter(countByQuery._statements, (statement) => excludeAttrFromCount.indexOf(statement.grouping) < 0)

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
 * Overriding the orginal knex.table method to prefix
 * the table name based upon the prefix option
 * defined in the config
 *
 * @param  {String} tableName
 *
 * @return {Object}
 */
Database.table = function (tableName) {
  const prefix = this._instancePrefix || this.client.config.prefix
  const prefixedTableName = (prefix && !this._skipPrefix) ? `${prefix}${tableName}` : tableName
  this._originalTable(prefixedTableName)
  return this
}

/**
 * Skipping the prefix for a single query
 *
 * @return {Object}
 */
Database.withoutPrefix = function () {
  this._skipPrefix = true
  return this
}

/**
 * Changing the prefix for a given query
 *
 * @param  {String} prefix
 *
 * @return {Object}
 */
Database.withPrefix = function (prefix) {
  this._instancePrefix = prefix
  return this
}

Database.pluckAll = function (fields) {
  const args = _.isArray(fields) ? fields : _.toArray(arguments)
  return this.select.apply(this, args)
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

QueryBuilder.prototype.forPage = Database.forPage
QueryBuilder.prototype.paginate = Database.paginate
QueryBuilder.prototype.chunk = Database.chunk
QueryBuilder.prototype._originalTable = QueryBuilder.prototype.table
QueryBuilder.prototype.table = Database.table
QueryBuilder.prototype.from = Database.table
QueryBuilder.prototype.into = Database.table
QueryBuilder.prototype.withPrefix = Database.withPrefix
QueryBuilder.prototype.withoutPrefix = Database.withoutPrefix
QueryBuilder.prototype.pluckAll = Database.pluckAll

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
