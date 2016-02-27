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
      knex.schema.dropTable('users')
    ]
    return bluebird.all(tables)
  },
  createRecords: function * (knex, table, values) {
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
