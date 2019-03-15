'use strict'

const path = require('path')
const _ = require('lodash')
const moment = require('moment')

module.exports = {
  formatQuery (query, connection) {
    if (process.env.DB === 'mysql' || process.env.DB === 'sqlite') {
      return query.replace(/"/g, '`')
    }
    return query
  },

  formatTime (value) {
    if (process.env.DB === 'mysql') {
      return moment(value).toISOString()
    }

    return value
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
        version: '5.7',
        connection: {
          host: '127.0.0.1',
          user: 'travis',
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
    const commands = []

    if (process.env.DB === 'mysql') {
      commands.push(db.schema.raw("SET GLOBAL sql_mode='NO_AUTO_VALUE_ON_ZERO'"))
      commands.push(db.schema.raw("SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO'"))
    }

    return Promise.all(commands.concat([
      db.schema.createTable('users', function (table) {
        table.increments()
        table.integer('vid')
        table.integer('country_id')
        table.integer('manager_id')
        table.integer('lead_id')
        table.integer('age')
        table.string('username')
        table.string('email')
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
      }),
      db.schema.createTable('followers', function (table) {
        table.increments('id')
        table.integer('user_id')
        table.integer('follower_id')
        table.boolean('has_blocked')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      db.schema.createTable('party_users', function (table) {
        table.increments('id')
        table.integer('party_id')
        table.string('username')
        table.timestamps()
      }),
      db.schema.createTable('teams', function (table) {
        table.increments('id')
        table.integer('party_id')
        table.string('name')
        table.timestamps()
      }),
      db.schema.createTable('team_user', function (table) {
        table.increments('id')
        table.integer('team_party_id')
        table.integer('user_party_id')
        table.timestamps()
      })
    ]))
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
      db.schema.dropTable('post_section'),
      db.schema.dropTable('followers'),
      db.schema.dropTable('party_users'),
      db.schema.dropTable('teams'),
      db.schema.dropTable('team_user')
    ])
  },

  sleep (time) {
    return new Promise((resolve) => {
      setTimeout(resolve, time)
    })
  }
}
