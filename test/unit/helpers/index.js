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

  formatBindings (bindings) {
    return bindings
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
        table.integer('vid')
        table.string('username')
        table.timestamps()
        table.timestamp('login_at')
        table.timestamp('deleted_at')
      }),
      db.schema.createTable('profiles', function (table) {
        table.increments()
        table.integer('user_id')
        table.string('profile_name')
        table.integer('likes')
        table.timestamps()
        table.timestamp('deleted_at')
      }),
      db.schema.createTable('pictures', function (table) {
        table.increments()
        table.integer('profile_id')
        table.string('storage_path')
        table.timestamps()
        table.timestamp('deleted_at')
      }),
      db.schema.createTable('identities', function (table) {
        table.increments()
        table.integer('user_id')
        table.boolean('is_active').defaultsTo(true)
        table.timestamps()
        table.timestamp('deleted_at')
      }),
      db.schema.createTable('my_users', function (table) {
        table.integer('uuid')
        table.string('username')
        table.timestamps()
        table.timestamp('deleted_at')
      })
    ])
  },

  dropTables (db) {
    return Promise.all([
      db.schema.dropTable('users'),
      db.schema.dropTable('profiles'),
      db.schema.dropTable('pictures'),
      db.schema.dropTable('identities'),
      db.schema.dropTable('my_users')
    ])
  },

  sleep (time) {
    return new Promise((resolve) => {
      setTimeout(resolve, time)
    })
  }
}
