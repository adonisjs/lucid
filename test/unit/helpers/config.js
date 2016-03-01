'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/
const path = require('path')
const mysqlConnections = require('./mysqlConnections')
const postgresConnection = require('./postgresConnection')
const sqliteConnections = require('./sqliteConnections')

module.exports = {
  get: function (key) {
    if (key === 'database.connection') {
      return process.env.DB
    }

    if (key === 'database.sqlite3') {
      return sqliteConnections.default
    }

    if (key === 'database.mysql') {
      return mysqlConnections.default
    }

    if (key === 'database.pg') {
      return postgresConnection.default
    }

    if (key === 'database.alternateConnection' && process.env.DB === 'sqlite3') {
      return sqliteConnections.alternateConnection
    }

    if (key === 'database.alternateConnection' && process.env.DB === 'mysql') {
      return mysqlConnections.alternateConnection
    }

    if (key === 'database.alternateConnection' && process.env.DB === 'pg') {
      return postgresConnection.alternateConnection
    }

  }
}
