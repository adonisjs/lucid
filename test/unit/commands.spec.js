'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global describe, it, after, before, context */
const Ioc = require('adonis-fold').Ioc
Ioc.bind('Adonis/Src/Command', function () {
  return require('adonis-ace/src/Command')
})
const Refresh = require('../../src/Commands/Refresh')
const Run = require('../../src/Commands/Run')
const Rollback = require('../../src/Commands/Rollback')
const Reset = require('../../src/Commands/Reset')
const Database = require('../../src/Database')
const Migrations = require('../../src/Migrations')
const Seeder = require('../../src/Seeder')
const Schema = require('../../src/Schema')
const filesFixtures = require('./fixtures/files')
const config = require('./helpers/config')
const chai = require('chai')
const path = require('path')
const expect = chai.expect
require('co-mocha')

const Helpers = {
  migrationsPath: function () {
    return path.join(__dirname, './migrations')
  }
}

const Config = {
  get: function () {
    return 'adonis_schema'
  }
}

describe('Commands', function () {
  before(function * () {
    Database._setConfigProvider(config)
    yield filesFixtures.createDir()
  })

  after(function * () {
    yield Database.schema.dropTableIfExists('adonis_schema')
    yield Database.schema.dropTableIfExists('users')
    yield Database.schema.dropTableIfExists('accounts')
    yield filesFixtures.cleanStorage()
    Database.close()
  })

  context('Refresh', function () {
    before(function () {
      const migrations = new Migrations(Database, Config)
      this.refresh = new Refresh(Helpers, migrations, Seeder)
    })

    it('should rollback and re-run all the migrations when the handle method is called', function * () {
      class Users extends Schema {
        up () {
          this.create('users', function (table) {
            table.increments()
            table.timestamps()
          })
        }
      }
      this.refresh.loadFiles = function () {
        const migrations = {}
        migrations[`${new Date().getTime()}_users`] = Users
        return migrations
      }

      yield this.refresh.handle({}, {})
      const users = yield Database.table('users').columnInfo()
      expect(users).to.be.an('object')
      expect(Object.keys(users)).deep.equal(['id', 'created_at', 'updated_at'])
      yield Database.schema.dropTable('adonis_schema')
      yield Database.schema.dropTable('users')
    })
  })

  context('Run', function () {
    before(function () {
      const migrations = new Migrations(Database, Config)
      this.run = new Run(Helpers, migrations, Seeder)
    })

    it('should migrate all pending migrations', function * () {
      class Users extends Schema {
        up () {
          this.create('users', function (table) {
            table.increments()
            table.timestamps()
          })
        }
      }
      this.run.loadFiles = function () {
        const migrations = {}
        migrations[`${new Date().getTime()}_users`] = Users
        return migrations
      }

      yield this.run.handle({}, {})
      const users = yield Database.table('users').columnInfo()
      expect(users).to.be.an('object')
      expect(Object.keys(users)).deep.equal(['id', 'created_at', 'updated_at'])
      yield Database.schema.dropTable('adonis_schema')
      yield Database.schema.dropTable('users')
    })
  })

  context('Rollback', function () {
    before(function () {
      const migrations = new Migrations(Database, Config)
      const rollbackMigrations = new Migrations(Database, Config)
      this.run = new Run(Helpers, migrations, Seeder)
      this.rollback = new Rollback(Helpers, rollbackMigrations, Seeder)
    })

    it('should rollback migrations to the previous batch', function * () {
      class Users extends Schema {
        up () {
          this.create('users', function (table) {
            table.increments()
            table.timestamps()
          })
        }
        down () {
          this.drop('users')
        }
      }
      const currentTime = new Date().getTime()
      const loadFiles = function () {
        const migrations = {}
        migrations[`${currentTime}_users`] = Users
        return migrations
      }
      this.run.loadFiles = loadFiles
      this.rollback.loadFiles = loadFiles

      yield this.run.handle({}, {})
      yield this.rollback.handle({}, {})
      const users = yield Database.table('users').columnInfo()
      expect(users).deep.equal({})
      yield Database.schema.dropTable('adonis_schema')
    })
  })

  context('Reset', function () {
    before(function () {
      const migrations = new Migrations(Database, Config)
      const resetMigrations = new Migrations(Database, Config)
      const reMigrations = new Migrations(Database, Config)
      this.run = new Run(Helpers, migrations, Seeder)
      this.reRun = new Run(Helpers, reMigrations, Seeder)
      this.reset = new Reset(Helpers, resetMigrations, Seeder)
    })

    it('should rollback migrations to the latest batch', function * () {
      class Users extends Schema {
        up () {
          this.create('users', function (table) {
            table.increments()
          })
        }
        down () {
          this.drop('users')
        }
      }
      class Accounts extends Schema {
        up () {
          this.create('accounts', function (table) {
            table.increments()
          })
        }
        down () {
          this.drop('accounts')
        }
      }
      const currentTime = new Date().getTime()
      this.run.loadFiles = function () {
        const migrations = {}
        migrations[`${currentTime}_users`] = Users
        return migrations
      }
      this.reRun.loadFiles = function () {
        const migrations = {}
        migrations[`${currentTime}_accounts`] = Accounts
        return migrations
      }
      this.reset.loadFiles = function () {
        const migrations = {}
        migrations[`${currentTime}_accounts`] = Accounts
        migrations[`${currentTime}_users`] = Users
        return migrations
      }

      yield this.run.handle({}, {})
      yield this.reRun.handle({}, {})
      const users = yield Database.table('users').columnInfo()
      const accounts = yield Database.table('accounts').columnInfo()
      expect(users).to.be.an('object')
      expect(Object.keys(users)).deep.equal(['id'])
      expect(accounts).to.be.an('object')
      expect(Object.keys(accounts)).deep.equal(['id'])

      yield this.reset.handle({}, {})
      const usersInfo = yield Database.table('users').columnInfo()
      const accountsInfo = yield Database.table('accounts').columnInfo()
      expect(usersInfo).deep.equal({})
      expect(accountsInfo).deep.equal({})

      yield Database.schema.dropTable('adonis_schema')
    })
  })
})
