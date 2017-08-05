'use strict'

const path = require('path')
const _ = require('lodash')

module.exports = {
  formatQuery (query, connection) {
    if (process.env.DB === 'sqlite' || process.env.DB === 'pg') {
      return query
    }

    if (process.env.DB === 'mysql') {
      return query.replace(/"/g, '`')
    }
  },

  addReturningStatement (query, field) {
    return process.env.DB === 'pg' ? `${query} returning "${field}"` : query
  },

  formatBindings (bindings) {
    return bindings
  },

  formatNumber (num) {
    return process.env.DB === 'pg' ? String(num) : num
  },

  formatBoolean (bool) {
    return process.env.DB === 'pg' ? bool : Number(bool)
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

    if (process.env.DB === 'pg') {
      return _.cloneDeep({
        client: 'pg',
        connection: {
          host: '127.0.0.1',
          user: 'harmindervirk',
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
        table.integer('country_id')
        table.string('username')
        table.timestamps()
        table.string('type').defaultTo('admin')
        table.timestamp('login_at')
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('cars', function (table) {
        table.increments()
        table.integer('user_id')
        table.string('name')
        table.string('model')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('parts', function (table) {
        table.increments()
        table.integer('car_id')
        table.string('part_name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('profiles', function (table) {
        table.increments()
        table.integer('user_id')
        table.integer('country_id')
        table.string('profile_name')
        table.integer('likes')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('pictures', function (table) {
        table.increments()
        table.integer('profile_id')
        table.string('storage_path')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('identities', function (table) {
        table.increments()
        table.integer('user_id')
        table.boolean('is_active').defaultTo(true)
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('my_users', function (table) {
        table.integer('uuid')
        table.string('username')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('posts', function (table) {
        table.increments('id')
        table.integer('user_id')
        table.string('title')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('post_user', function (table) {
        table.increments('id')
        table.integer('post_id')
        table.integer('user_id')
        table.boolean('is_published')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('countries', function (table) {
        table.increments('id')
        table.string('name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('categories', function (table) {
        table.increments('id')
        table.string('name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('sections', function (table) {
        table.increments('id')
        table.integer('category_id')
        table.string('name')
        table.boolean('is_active')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('post_section', function (table) {
        table.increments('id')
        table.integer('post_id')
        table.integer('section_id')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      })
    ])
  },

  dropTables (db) {
    return Promise.all([
      db.schema.dropTable('users'),
      db.schema.dropTable('cars'),
      db.schema.dropTable('parts'),
      db.schema.dropTable('profiles'),
      db.schema.dropTable('pictures'),
      db.schema.dropTable('identities'),
      db.schema.dropTable('my_users'),
      db.schema.dropTable('posts'),
      db.schema.dropTable('post_user'),
      db.schema.dropTable('countries'),
      db.schema.dropTable('categories'),
      db.schema.dropTable('sections'),
      db.schema.dropTable('post_section')
    ])
  },

  sleep (time) {
    return new Promise((resolve) => {
      setTimeout(resolve, time)
    })
  }
}
