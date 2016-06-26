'use strict'

const bluebird = require('bluebird')

module.exports = {
  up: function (knex) {
    const tables = [
      knex.schema.createTable('users', function (table) {
        table.increments()
        table.string('username')
        table.string('firstname')
        table.string('lastname')
        table.string('status')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('accounts', function (table) {
        table.increments()
        table.string('account_name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('profiles', function (table) {
        table.increments()
        table.integer('user_id')
        table.string('display_name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('cars', function (table) {
        table.increments()
        table.integer('user_id')
        table.string('car_name')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      }),
      knex.schema.createTable('keys', function (table) {
        table.increments()
        table.integer('car_id')
        table.string('key_number')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      })
    ]
    return bluebird.all(tables)
  },

  down: function (knex) {
    const dropTables = [
      knex.schema.dropTable('users'),
      knex.schema.dropTable('accounts'),
      knex.schema.dropTable('profiles'),
      knex.schema.dropTable('cars'),
      knex.schema.dropTable('keys')
    ]
    return bluebird.all(dropTables)
  },

  truncate: function (knex) {
    const truncateTables = [
      knex.table('users').truncate(),
      knex.table('accounts').truncate(),
      knex.table('profiles').truncate(),
      knex.table('cars').truncate(),
      knex.table('keys').truncate()
    ]
    return bluebird.all(truncateTables)
  },

  setupAccount: function (knex) {
    return knex.table('accounts').insert({account_name: 'sales', created_at: new Date(), updated_at: new Date()})
  },

  setupProfile: function (knex) {
    return knex.table('profiles').insert({user_id: 1, display_name: 'virk', created_at: new Date(), updated_at: new Date()})
  },

  setupCar: function (knex) {
    return knex.table('cars').insert({user_id: 1, car_name: 'audi a6', created_at: new Date(), updated_at: new Date()})
  },

  setupCarKey: function (knex) {
    return knex.table('keys').insert({car_id: 1, key_number: '98010291222', created_at: new Date(), updated_at: new Date()})
  },

  setupUser: function (knex) {
    return knex.table('users').insert({
      firstname: 'aman',
      lastname: 'virk',
      username: 'avirk',
      created_at: new Date(),
      updated_at: new Date()
    })
  }

}
