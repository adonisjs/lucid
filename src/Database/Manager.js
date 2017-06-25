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

const proxyHandler = {
  get (target, name) {
    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    const db = target.connection()
    if (typeof (db[name]) === 'function') {
      return db[name].bind(db)
    }
    return db[name]
  }
}

/**
 * DatabaseManager is a layer on top of {{crossLink "Database"}}{{/crossLink}}
 * class which manages a pool of different database connections and proxy
 * all Database methods, so that it's easier to work with them.
 *
 * @binding Adonis/Src/Database
 * @singleton
 * @alias Database
 *
 * @class DatabaseManager
 */
class DatabaseManager {
  constructor (Config) {
    this.Config = Config
    this._connectionPools = {}
    return new Proxy(this, proxyHandler)
  }

  /**
   * Creates a new/resuse and returns the database connection.
   *
   * @method connection
   *
   * @param  {String}   [name = Config.get('database.connection')]
   *
   * @return {Database}
   */
  connection (name) {
    name = name || this.Config.get('database.connection')

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
