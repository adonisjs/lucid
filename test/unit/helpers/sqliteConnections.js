'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/
const path = require('path')

module.exports = {
  default : {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../storage/test.sqlite3')
    },
    useNullAsDefault: true,
    debug: false
  },

  alternateConnection: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../storage/test2.sqlite3')
    },
    useNullAsDefault: true
  }
}
