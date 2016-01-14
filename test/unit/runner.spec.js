'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

/* global describe, it, before, beforeEach */
const Runner = require('../../src/Runner')
const Schema = require('../../src/Schema')
const chai = require('chai')
const manageDb = require('./blueprints/manage')
const blueprint = require('./blueprints/schema-blueprint')
const path = require('path')
const expect = chai.expect

describe('Runner', function () {
  before(function (done) {
    blueprint()
      .then(function () {
        done()
      })
      .catch(done)
  })

  after(function (done) {
    manageDb
      .remove(path.join(__dirname, './storage/schema.sqlite3'))
      .then(function () {
        done()
      })
      .catch(done)
  })

  beforeEach(function () {
    const Config = {
      get: function (name) {
        if (name === 'database.migrationsTable') {
          return 'adonis_migrations'
        }
        return {
          client: 'sqlite3',
          connection: {
            filename: path.join(__dirname, './storage/schema.sqlite3')
          },
          debug: false
        }
      }
    }
    this.runner = new Runner(Config)
  })

  it('should migrate a class using up method', function () {
    class Users extends Schema {
      up() {
        this.create('users', function (table) {
          table.increments('id')
          table.string('username')
          table.string('email_address')
          table.timestamps()
        })
      }
    }
    this.runner._migrateClass(new Users(), 'up')
    expect(this.runner.migrations).to.be.an('array')
    expect(this.runner.migrations).to.have.length(1)
  })

  it('should migrate multiple actions defined inside up method', function () {
    class Users extends Schema {
      up() {
        this.create('users', function (table) {
          table.increments('id')
          table.string('username')
          table.string('email_address')
          table.timestamps()
        })

        this.create('post', function (table) {
          table.increments('id')
          table.string('post_title')
          table.string('post_description')
          table.timestamps()
        })
      }
    }
    this.runner._migrateClass(new Users(), 'up')
    expect(this.runner.migrations).to.be.an('array')
    expect(this.runner.migrations).to.have.length(2)
  })

  it('should return diff for migrations to be created', function (done) {
    const migrations = {'2015-12-26-create_users_table': function () {}}
    this.runner
      ._diff(migrations, 'up')
      .then((difference) => {
        expect(difference).deep.equal(['2015-12-26-create_users_table'])
        done()
      }).catch(done)
  })

  it('should return diff for migrations to be rolled back', function (done) {
    const migrations = {'2015-12-26-create_users_table': function () {}}
    this.runner
      ._diff(migrations, 'down')
      .then((difference) => {
        expect(difference).deep.equal([])
        done()
      }).catch(done)
  })

  it('should create migrations table ', function (done) {
    this.runner
      ._makeMigrationsTable()
      .then((difference) => {
        this.runner.knex('adonis_migrations')
          .then(() => {
            done()
          })
      }).catch(done)
  })

  it('should return migrations batch', function (done) {
    this.runner
      ._getLatestBatch()
      .then((batch) => {
        expect(batch).to.equal(0)
        done()
      }).catch(done)
  })

  it('should up all the migrations defined in migrations files', function (done) {
    class Users extends Schema {
      up() {
        this.create('users', function (table) {
          table.increments('id')
          table.string('username')
        })
      }
    }

    class Accounts extends Schema {
      up() {
        this.create('accounts', function (table) {
          table.increments('id')
          table.string('account_id')
        })
      }
    }

    const migrations = {'2015-12-26_create_users_table': Users, '2015-12-26_create_accounts_table': Accounts}

    this.runner
      .up(migrations)
      .then((response) => {
        expect(response.status).to.equal('completed')
        expect(response.migrated).deep.equal(Object.keys(migrations))
        done()
      }).catch(done)
  })

  it('should skip all the migrations migrated already', function (done) {
    class Users extends Schema {
      up() {
        this.create('users', function (table) {
          table.increments('id')
          table.string('username')
        })
      }
    }

    class Accounts extends Schema {
      up() {
        this.create('accounts', function (table) {
          table.increments('id')
          table.string('account_id')
        })
      }
    }

    const migrations = {'2015-12-26_create_users_table': Users, '2015-12-26_create_accounts_table': Accounts}

    this.runner
      .up(migrations)
      .then((response) => {
        expect(response.status).to.equal('skipped')
        expect(response.migrated).deep.equal([])
        done()
      }).catch(done)
  })

  it('should return diff for files to be used for rollback', function (done) {
    class Users extends Schema {
      up() {
        this.create('users', function (table) {
          table.increments('id')
          table.string('username')
        })
      }
    }

    class Accounts extends Schema {
      up() {
        this.create('accounts', function (table) {
          table.increments('id')
          table.string('account_id')
        })
      }
    }
    const migrations = {'2015-12-26_create_users_table': Users, '2015-12-26_create_accounts_table': Accounts}
    this.runner
      ._diff(migrations, 'down')
      .then((difference) => {
        expect(difference).deep.equal(Object.keys(migrations))
        done()
      }).catch(done)
  })

  it('should rollback latest batch using down method and delete them from migrations table', function (done) {
    class Users extends Schema {
      down() {
        this.drop('users')
      }
    }

    class Accounts extends Schema {
      down() {
        this.drop('accounts')
      }
    }
    const migrations = {'2015-12-26_create_users_table': Users, '2015-12-26_create_accounts_table': Accounts}

    this.runner
      .down(migrations)
      .then((response) => {
        expect(response.status).to.equal('completed')
        expect(response.migrated).deep.equal(Object.keys(migrations))
        done()
      }).catch(done)
  })

  it('should skip rollback when already at the lowest version', function (done) {
    class Users extends Schema {
      down() {
        this.drop('users')
      }
    }

    class Accounts extends Schema {
      down() {
        this.drop('accounts')
      }
    }
    const migrations = {'2015-12-26_create_users_table': Users, '2015-12-26_create_accounts_table': Accounts}

    this.runner
      .down(migrations)
      .then((response) => {
        expect(response.status).to.equal('skipped')
        expect(response.migrated).deep.equal([])
        done()
      }).catch(done)
  })

  it('should throw an error when trying to migrate a non class object', function (done) {
    const migrations = {'2015-12-27_create_users_table': {}}

    this.runner
      .up(migrations)
      .then(() => {
      })
      .catch(function (error) {
        expect(error.message).to.match(/Make sure you are exporting/)
        done()
      })
  })

  it('should not run migrations when migrations table is locked', function (done) {
    class Users extends Schema {
      down() {
        this.drop('users')
      }
    }

    class Accounts extends Schema {
      down() {
        this.drop('accounts')
      }
    }
    const migrations = {'2015-12-26_create_users_table': Users, '2015-12-26_create_accounts_table': Accounts}

    this.runner
      ._makeLockTable()
      .then(() => {
        return this.runner._addLock()
      })
      .then(() => {
        return this.runner.up(migrations)
      })
      .then(() => {
      })
      .catch(function (error) {
        expect(error.message).to.match(/Migrations are locked/)
        done()
      })
  })
})
