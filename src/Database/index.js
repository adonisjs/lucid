'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const knex = require('knex')

/**
 * @module Database
 * @description Fluent query builder for adonis framework
 */
class Database {

  constructor (Env, Config) {
    /**
     * grab default database connection from env file
=   */
    const dbConnection = Env.get('DB_CONNECTION')

    if (!dbConnection) {
      throw new Error(`Specify DB_CONNECTION under .env file`)
    }

    /**
     * grabbing connection settings using config store
     */
    const connectionSettings = Config.get(`database.${dbConnection}`)
    let instance = knex(connectionSettings)

    /**
     * extending instance to have a method called
     * connection to switch connections on fly
     */
    instance.connection = function (connection) {
      const newConnectionSettings = Config.get(`database.${connection}`)
      return knex(newConnectionSettings)
    }
    return instance
  }

}

module.exports = Database
