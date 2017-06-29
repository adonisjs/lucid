'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('./MonkeyPatch')

const Database = require('.')
const CE = require('../Exceptions')
const proxyGet = require('../../lib/proxyGet')

/**
 * DatabaseManager is a layer on top of @ref('Database') class. It
 * manages a pool of different database connections and proxy all
 * Database methods, so that it's easier to work with them.
 *
 * ```js
 * const Database = use('Database')
 *
 * // making query on default connection
 * await Database.table('users')
 *
 * // making query on selected connection
 * await Database.connection('mysql').table('users')
 * ```
 *
 * @binding Adonis/Src/Database
 * @singleton
 * @alias Database
 * @group Database
 *
 * @class DatabaseManager
 */
class DatabaseManager {
  constructor (Config) {
    this.Config = Config
    this._connectionPools = {}
    return new Proxy(this, {
      get: proxyGet('connection', true)
    })
  }

  /**
   * Creates a new database connection for a the config defined inside
   * config/database. You just need to pass the key name or don't
   * pass any name to use the default connection.
   *
   * Also this method will return the existing connection instance if
   * it exists.
   *
   * @method connection
   *
   * @param  {String}   [name = Config.get('database.connection')]
   *
   * @return {Database}
   */
  connection (name) {
    name = name || this.Config.get('database.connection')

    /**
     * Return connection if part of connection pool already
     */
    if (this._connectionPools[name]) {
      return this._connectionPools[name]
    }

    const connectionSettings = this.Config.get(`database.${name}`)
    if (!connectionSettings) {
      throw CE.RuntimeException.missingDatabaseConnection(name)
    }

    this._connectionPools[name] = new Database(connectionSettings)
    return this._connectionPools[name]
  }
}

module.exports = DatabaseManager
