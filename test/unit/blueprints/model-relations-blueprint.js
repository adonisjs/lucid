'use strict'

const Q = require('q')

let blueprint = exports = module.exports = {}

blueprint.tearDown = function(knex) {
  const tablesToRemove = [
    knex.schema.dropTable('users'),
    knex.schema.dropTable('phones'),
    knex.schema.dropTable('authors'),
    knex.schema.dropTable('books'),
    knex.schema.dropTable('author_book'),
    knex.schema.dropTable('articles'),
    knex.schema.dropTable('countries'),
    knex.schema.dropTable('agencies'),
    knex.schema.dropTable('chat_operators'),
    knex.schema.dropTable('relation_table'),
    knex.schema.dropTable('cbooks')
  ]
  let result = Q()
  tablesToRemove.forEach(function (item) {
    result = result.then(function () {
      return item
    })
  })
  return result
}

blueprint.setup = function(knex) {

  const setupTables = [
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
      table.integer('agency_id').references('id').inTable('agencies').onDelete('CASCADE')
      table.string('phone_number')
      table.boolean('is_mobile').defaultsTo(0)
      table.timestamps()
      table.timestamp('deleted_at')

    }),
    knex.schema.createTable('agencies', function (table) {

      table.increments()
      table.string('agency_name')
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
    knex.schema.createTable('countries', function (table) {

      table.increments()
      table.string('country_name')
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
      table.integer('country_id').references('id').inTable('countries').onDelete('CASCADE')
      table.timestamps()
      table.timestamp('deleted_at')

    }),
    knex.schema.createTable('chat_operators', function (table) {

     table.increments('co_id')
     table.string('operator_name')
     table.timestamps()
     table.timestamp('deleted_at')

    }),
    knex.schema.createTable('cbooks', function (table) {

     table.increments('book_id')
     table.string('book_title')
     table.timestamps()
     table.timestamp('deleted_at')

    }),
    knex.schema.createTable('relation_table', function (table) {

     table.increments()
     table.integer('relation_book_id').references('book_id').inTable('cbooks').onDelete('CASCADE')
     table.string('relation_user_id').references('co_id').inTable('chat_operators').onDelete('CASCADE')

    })
  ]
  let result = Q()
  setupTables.forEach(function (item) {
    result = result.then(function () {
      return item
    })
  })
  return result
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

  const countries = [
    {
      country_name: 'India'
    }
  ]

  const articles = [
    {
      article_title: 'Hello World',
      country_id: 1,
      user_id : 1
    },
    {
      article_title: 'Bye World',
      country_id: 1,
      user_id : 2
    }
  ]

  const agencies = [
    {
      agency_name: 'VodaFone',
    }
  ]

  const operators = [
    {
      operator_name:'virk'
    }
  ]

  const cbooks = [
    {
      book_title:'virk reading node'
    }
  ]

  const relational_values = [
    {
      relation_book_id:1,
      relation_user_id:1
    }
  ]


  const seeds = [
    knex.table('users').insert(users),
    knex.table('phones').insert(phones),
    knex.table('authors').insert(authors),
    knex.table('books').insert(books),
    knex.table('author_book').insert(author_book),
    knex.table('countries').insert(countries),
    knex.table('articles').insert(articles),
    knex.table('agencies').insert(agencies),
    knex.table('chat_operators').insert(operators),
    knex.table('cbooks').insert(cbooks),
    knex.table('relation_table').insert(relational_values)
  ]
  let result = Q()
  seeds.forEach(function (item) {
    result = result.then(function () {
      return item
    })
  })
  return result
}
