'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/*
|--------------------------------------------------------------------------
| COMMANDS
|--------------------------------------------------------------------------
|
| Ace commands tests are written in this file.
|
*/

/* global describe, it, after, before */
const chai = require('chai')
const expect = chai.expect
const fold = require('adonis-fold')
const Ioc = fold.Ioc
const setup = require('./setup')
require('co-mocha')

describe('Commands', function () {
  before(function * () {
    setup.loadProviders()
    setup.registerCommands()
    require('./database/factory.js')
    const Lucid = Ioc.use('Adonis/Src/Lucid')
    class User extends Lucid {}
    Ioc.bind('App/Model/User', function () {
      return User
    })

    this.database = Ioc.use('Adonis/Src/Database')
  })

  after(function * () {
    yield this.database.schema.dropTableIfExists('users')
    yield this.database.schema.dropTableIfExists('adonis_migrations')
  })

  it('should create the users table using migrations', function * () {
    yield setup.runCommand('migration:run', {}, {})
    const usersTable = yield this.database.table('users').columnInfo()
    expect(usersTable).to.be.an('object')
    expect(Object.keys(usersTable)).deep.equal(['id', 'username', 'email', 'firstname', 'lastname', 'password', 'created_at', 'updated_at'])
  })

  it('should seed database by creating five users', function * () {
    yield setup.runCommand('db:seed', {}, {})
    const users = yield this.database.table('users')
    expect(users.length).to.equal(5)
  })

  it('should rollback by dropping users table', function * () {
    yield setup.runCommand('migration:rollback', {}, {})
    const usersInfo = yield this.database.table('users').columnInfo()
    expect(usersInfo).deep.equal({})
  })

  it('should show migrations status', function * () {
    yield setup.runCommand('migration:status', {}, {})
  })
})
