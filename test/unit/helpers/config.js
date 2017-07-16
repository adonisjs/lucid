'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/
const mysqlConnections = require('./mysqlConnections')
const postgresConnection = require('./postgresConnection')
const sqliteConnections = require('./sqliteConnections')
const get = function (key, hasPrefix) {
  if (key === 'database.migrationsTable') {
    return 'adonis_migrations'
  }

  if (key === 'database.connection') {
    return process.env.DB
  }

  if (key === 'database.sqlite3') {
    return hasPrefix ? sqliteConnections.defaultPrefix : sqliteConnections.default
  }

  if (key === 'database.mysql') {
    return hasPrefix ? mysqlConnections.defaultPrefix : mysqlConnections.default
  }

  if (key === 'database.pg') {
    return hasPrefix ? postgresConnection.defaultPrefix : postgresConnection.default
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

module.exports = {
  get: function (key) {
    return get(key, false)
  },
  withPrefix: {
    get: function (key) {
      return get(key, true)
    }
  }
}
