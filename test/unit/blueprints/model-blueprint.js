'use strict'

const Q = require('q')

let blueprint = exports = module.exports = {}

blueprint.tearDown = function(knex) {
  return Q.all([
    knex.schema.dropTable('users')
  ])
}

blueprint.setup = function(knex) {

  return Q.all([
    knex.schema.createTable('users', function (table) {

      table.increments()
      table.string('username')
      table.string('displayName')
      table.integer('age')
      table.string('status')
      table.timestamps()
      table.timestamp('deleted_at')

    })
  ])
}

blueprint.seed = function(knex){

  const users = [
    {
      username : 'virk',
      age   : 22
    },
    {
      username : 'nikk',
      age   : 23
    },
    {
      username : 'baz',
      age   : 23,
      deleted_at: new Date()
    }
  ]

  return Q.all([
    knex.table('users').insert(users)
  ])
}
