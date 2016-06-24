'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/

const path = require('path')
const bluebird = require('bluebird')
const files = require('./files')

module.exports = {
  setupTables: function (knex) {
    const tables = [
      knex.schema.createTable('suppliers', function (table) {
        table.increments()
        table.string('name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('accounts', function (table) {
        table.increments()
        table.integer('supplier_id')
        table.string('name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('profiles', function (table) {
        table.increments()
        table.integer('account_id')
        table.string('profile_name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('head_offices', function (table) {
        table.increments()
        table.integer('supplier_id')
        table.string('location')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('all_suppliers', function (table) {
        table.increments()
        table.string('regid').unique()
        table.string('name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('all_accounts', function (table) {
        table.increments()
        table.string('supplier_regid')
        table.string('name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('users', function (table) {
        table.increments()
        table.string('username')
        table.integer('manager_id')
        table.string('type')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('posts', function (table) {
        table.increments()
        table.string('title')
        table.string('body')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('comments', function (table) {
        table.increments()
        table.integer('post_id')
        table.string('body')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('students', function (table) {
        table.increments()
        table.string('name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('courses', function (table) {
        table.increments()
        table.string('title')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('course_student', function (table) {
        table.integer('student_id')
        table.integer('course_id')
        table.boolean('is_enrolled')
        table.integer('lessons_done')
      }),
      knex.schema.createTable('authors', function (table) {
        table.increments()
        table.integer('country_id')
        table.string('name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('publications', function (table) {
        table.increments()
        table.integer('author_id')
        table.string('title')
        table.string('body')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('countries', function (table) {
        table.increments()
        table.string('name')
        table.string('locale')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      })
    ]
    return bluebird.all(tables)
  },
  dropTables: function (knex) {
    const tables = [
      knex.schema.dropTable('accounts'),
      knex.schema.dropTable('head_offices'),
      knex.schema.dropTable('profiles'),
      knex.schema.dropTable('suppliers'),
      knex.schema.dropTable('all_accounts'),
      knex.schema.dropTable('all_suppliers'),
      knex.schema.dropTable('users'),
      knex.schema.dropTable('posts'),
      knex.schema.dropTable('comments'),
      knex.schema.dropTable('courses'),
      knex.schema.dropTable('students'),
      knex.schema.dropTable('course_student'),
      knex.schema.dropTable('authors'),
      knex.schema.dropTable('publications'),
      knex.schema.dropTable('countries')
    ]
    return bluebird.all(tables)
  },
  createRecords: function * (knex, table, values) {
    if (table === 'course_student') {
      return yield knex.table(table).insert(values)
    }
    return yield knex.table(table).insert(values).returning('id')
  },
  truncate: function * (knex, table) {
    yield knex.table(table).truncate()
  },
  up: function * (knex) {
    yield files.createDir()
    yield this.setupTables(knex)
  },
  down: function * (knex) {
    yield this.dropTables(knex)
  }
}
