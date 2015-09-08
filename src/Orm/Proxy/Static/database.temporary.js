'use strict'

// get this kid from Ioc container
const path = require('path')
const Database = require('../../../Database')

let Env = {
  get: function () {
    return 'sqlite'
  }
}

let Config = {
  get: function () {
    return {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, '../../../../test/unit/storage/test.sqlite3')
      }
    }
  }
}

module.exports = new Database(Env, Config)
