'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/

module.exports = {
  default : {
    client: 'mysql',
    connection: {
      user     : 'root',
      password : '',
      database : 'default'
    }
  },

  alternateConnection: {
    client: 'mysql',
    connection: {
      user     : 'root',
      password : '',
      database : 'alternate'
    }
  },

  defaultPrefix : {
    client: 'mysql',
    connection: {
      user     : 'root',
      password : '',
      database : 'default'
    },
    prefix: 'ad_'
  }
}
