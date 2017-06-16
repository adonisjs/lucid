'use strict'

const path = require('path')
const _ = require('lodash')

module.exports = {
  formatQuery (query, connection) {
    if (process.env.DB === 'sqlite') {
      return query
    }

    if (process.env.DB === 'mysql') {
      return query.replace(/"/g, '`')
    }
  },

  getConfig () {
    if (process.env.DB === 'sqlite') {
      return _.cloneDeep({
        client: 'sqlite',
        connection: {
          filename: path.join(__dirname, '../tmp/dev.sqlite3')
        }
      })
    }

    if (process.env.DB === 'mysql') {
      return _.cloneDeep({
        client: 'mysql',
        connection: {
          host: '127.0.0.1',
          user: 'root',
          password: '',
          database: 'testing_lucid'
        }
      })
    }
  },

  createTables (db) {
    return Promise.all([
      db.schema.createTable('users', function (table) {
        table.increments()
        table.string('username')
        table.timestamps()
      })
    ])
  },

  dropTables (db) {
    return Promise.all([
      db.schema.dropTable('users')
    ])
  }
}
