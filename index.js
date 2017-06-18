'use strict'

const path = require('path')
const knex = require('knex')({
  client: 'sqlite',
  connection: ':memory:',
  debug: true,
  useNullAsDefault: true
})

knex
  .schema
  .createTableIfNotExists('users', function (table) {
    table.integer('uuid')
    table.string('username')
  })
  .then(() => {
    return knex
      .table('users')
      .insert({ uuid: 1100, username: 'virk' })
  })
  .then(console.log)
  .catch(console.error)
