'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/

module.exports = {
  default: {
    client: 'mysql',
    version: '5.7',
    connection: {
      user: 'virk',
      password: 'virk',
      database: 'default'
    }
  },

  alternateConnection: {
    client: 'mysql',
    version: '5.7',
    connection: {
      user: 'virk',
      password: 'virk',
      database: 'alternate'
    }
  },

  defaultPrefix: {
    client: 'mysql',
    version: '5.7',
    connection: {
      user: 'virk',
      password: 'virk',
      database: 'default'
    },
    prefix: 'ad_'
  }
}
