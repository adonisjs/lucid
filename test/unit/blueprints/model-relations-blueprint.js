'use strict'

const Q = require('q')

let blueprint = exports = module.exports = {}

blueprint.tearDown = function(knex) {
  return Q.all([
    knex.schema.dropTable('users'),
    knex.schema.dropTable('phones'),
    knex.schema.dropTable('authors'),
    knex.schema.dropTable('books'),
    knex.schema.dropTable('author_book'),
    knex.schema.dropTable('articles')
  ])
}

blueprint.setup = function(knex) {

  return Q.all([
    knex.schema.createTable('users', function (table) {

      table.increments()
      table.string('username')
      table.string('password')
      table.string('status')
      table.timestamps()
      table.timestamp('deleted_at')

    }),
    knex.schema.createTable('phones', function (table) {

      table.increments()
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.string('phone_number')
      table.boolean('is_mobile').defaultsTo(0)
      table.timestamps()
      table.timestamp('deleted_at')

    }),
    knex.schema.createTable('authors', function (table) {

      table.increments()
      table.string('author_name')
      table.timestamps()
      table.timestamp('deleted_at')

    }),
    knex.schema.createTable('books', function (table) {

      table.increments()
      table.string('book_title')
      table.timestamps()
      table.timestamp('deleted_at')

    }),
    knex.schema.createTable('author_book', function (table) {

      table.increments()
      table.integer('author_id').references('id').inTable('authors').onDelete('CASCADE')
      table.integer('book_id').references('id').inTable('books').onDelete('CASCADE')
      table.boolean('is_primary')
      table.timestamps()
      table.timestamp('deleted_at')

    }),
    knex.schema.createTable('articles', function (table) {

      table.increments()
      table.string('article_title')
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.timestamps()
      table.timestamp('deleted_at')

    })    
  ])  
}

blueprint.seed = function(knex){

  const users = [
    {
      username : 'virk',
      password : 'foo',
      status   : 'active'
    },
    {
      username : 'nikk',
      password : 'bar',
      status   : 'active'
    }
  ]

  const phones = [
    {
      user_id : 1,
      phone_number : '1234567890'
    },
    {
      user_id : 2,
      phone_number : '1234567890',
      is_mobile : 1
    }
  ]

  const authors = [
    {
      author_name: 'virk'
    },
    {
      author_name: 'nikk'
    }
  ]

  const books = [
    {
      book_title: 'Javascript'
    },
    {
      book_title: 'Nodejs'
    }
  ]

  const author_book = [
    {
      author_id: 1,
      book_id: 1,
      is_primary: 1
    },
    {
      author_id: 1,
      book_id: 2,
      is_primary: 0
    },
    {
      author_id: 2,
      book_id: 1,
      is_primary: 0
    },
    {
      author_id: 2,
      book_id: 2,
      is_primary: 1
    }
  ]

  const articles = [
    {
      article_title: 'Hello World',
      user_id : 1
    },
    {
      article_title: 'Bye World',
      user_id : 2
    }
  ]


  return Q.all([
    knex.table('users').insert(users),
    knex.table('phones').insert(phones),
    knex.table('authors').insert(authors),
    knex.table('books').insert(books),
    knex.table('author_book').insert(author_book),
    knex.table('articles').insert(articles)
  ])
}