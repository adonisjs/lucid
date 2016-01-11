'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

/* global describe, it, before, after, context */

const Make = require('../../src/Commands/Make')
const Run = require('../../src/Commands/Run')
const Ioc = require('adonis-fold').Ioc
const manageFiles = require('./blueprints/manage')
const Rollback = require('../../src/Commands/Rollback')
const chai = require('chai')
const path = require('path')
const fs = require('fs-extra')
const co = require('co')
const expect = chai.expect

let migName = ''
const Helpers = {
  migrationsPath: function (name) {
    if (name) {
      migName = path.join(__dirname, './migrations', name)
      return migName
    } else {
      return path.join(__dirname, './migrations')
    }
  }
}
Ioc.bind('Adonis/Src/Helpers', function () {
  return Helpers
})

Ioc.bind('Adonis/Src/Ansi', function () {
  return {
    icon: function () {
      return ''
    },
    success: function () {
    },
    info: function () {

    }
  }
})


describe('Commands', function () {
  before(function (done) {
    GLOBAL.use = Ioc.use

    fs.emptyDir(path.join(__dirname, './migrations'), function (error) {
      if (error) {
        done(error)
      } else {
        done()
      }
    })
  })

  after(function (done) {
    fs.emptyDir(path.join(__dirname, './migrations'), function (error) {
      if (error) {
        done(error)
      } else {
        done()
      }
    })
  })

  context('Make', function () {

    it('should handle error when unable to create migrations file', function (done) {
      expect(Make.description).not.equal(undefined)
      expect(Make.signature).not.equal(undefined)

      Ioc.bind('Adonis/Src/Helpers', function () {
        return {
          migrationsPath: function (name) {
            return path.join(__dirname, './mg', name)
          }
        }
      })

      co(function *() {
        yield Make.handle({name: 'create_users_table'}, {})
      })
      .then(function (){

      })
      .catch(function(error) {
        expect(error.code).to.equal('ENOENT')
        done()
      })
    })

    it('should create a file inside migrations directory', function (done) {
      expect(Make.description).not.equal(undefined)
      expect(Make.signature).not.equal(undefined)

      Ioc.bind('Adonis/Src/Helpers', function () {
        return Helpers
      })

      co(function * () {
        yield Make.handle({name: 'create_users_table'}, {})
      })
      .then(function () {
        fs.ensureFile(migName, function (err) {
          if (err) {
            done(err)
          } else {
            done()
          }
        })
      })
      .catch(done)
    })

    it('should create a file with create table markup when no flags have been passed', function (done) {
      let createCalled = false
      let dropCalled = false
      Ioc.bind('Adonis/Src/Helpers', function () {
        return Helpers
      })

      class Schema {
        create () {
          createCalled = true
        }
        drop () {
          dropCalled = true
        }
      }

      Ioc.bind('Schema', function () {
        return Schema
      })
      co(function * () {
        yield Make.handle({name: 'create_users_table'}, {})
      })
      .then(function () {
        const Migration = require(migName)
        const migration = new Migration()
        migration.up()
        migration.down()
        expect(createCalled).to.equal(true)
        expect(dropCalled).to.equal(true)
        done()
      })
      .catch(done)
    })

    it('should create a file with create table markup when no create flag have been passed', function (done) {
      let creatTable = null
      let dropTable = null
      Ioc.bind('Adonis/Src/Helpers', function () {
        return Helpers
      })

      class Schema {
        create (name) {
          creatTable = name
        }
        drop (name) {
          dropTable = name
        }
      }

      Ioc.bind('Schema', function () {
        return Schema
      })
      co(function * () {
        yield Make.handle({name: 'create_users_table'}, {create:'accounts'})
      })
      .then(function () {
        const Migration = require(migName)
        expect(Migration.name).to.equal('Accounts')
        const migration = new Migration()
        migration.up()
        migration.down()
        expect(creatTable).to.equal('accounts')
        expect(dropTable).to.equal('accounts')
        done()
      })
      .catch(done)
    })

    it('should create a file with update table markup when no table flag has been passed', function (done) {
      let selectedTable = null
      Ioc.bind('Adonis/Src/Helpers', function () {
        return Helpers
      })

      class Schema {
        table (name) {
          selectedTable = name
        }
      }

      Ioc.bind('Schema', function () {
        return Schema
      })
      co(function * () {
        yield Make.handle({name: 'create_users_table'}, {table: 'users'})
      })
      .then(function () {
        const Migration = require(migName)
        expect(Migration.name).to.equal('Users')
        const migration = new Migration()
        migration.up()
        expect(selectedTable).to.equal('users')
        done()
      })
      .catch(done)
    })
  })

  context('Run', function () {
    it('should throw error when running in production environment', function (done) {
      process.env.NODE_ENV = 'production'
      const Runner = {
        up: function * (files) {
          return {status:'completed'}
        }
      }
      Ioc.bind('Adonis/Src/Runner', function () {
        return Runner
      })
      co(function * () {
        return yield Run.handle({}, {})
      })
        .then(function () {})
        .catch(function (error) {
          expect(error.message).to.match(/Cannot run migrations in production/)
          done()
        })
    })

    it('should pass all migrations to runner run method', function (done) {
      process.env.NODE_ENV = 'development'
      let migrations = []
      const Runner = {
        up: function * (files) {
          migrations = files
          return {status:'completed'}
        }
      }
      Ioc.bind('Adonis/Src/Runner', function () {
        return Runner
      })
      expect(Run.description).not.equal(undefined)
      expect(Run.signature).not.equal(undefined)

      co(function * () {
        return yield Run.handle({}, {})
      })
        .then(function () {
          const basename = path.basename(migName).replace('.js', '')
          expect(migrations).to.have.property(basename)
          done()
        })
        .catch(done)
    })

    it('should ignore any other files apart from files ending in .js', function (done) {
      process.env.NODE_ENV = 'development'
      let migrations = []
      const Runner = {
        up: function * (files) {
          migrations = files
          return {status:'completed'}
        }
      }
      Ioc.bind('Adonis/Src/Runner', function () {
        return Runner
      })
      expect(Run.description).not.equal(undefined)
      expect(Run.signature).not.equal(undefined)

      manageFiles
      .make(Helpers.migrationsPath('.gitkeep'))
      .then(function () {
        return Run.handle({}, {})
      })
      .then(function () {
        const basename = path.basename(migName).replace('.js', '')
        expect(migrations).not.have.property('.gitkeep')
        done()
      })
      .catch(done)
    })

    it('should handle skipped status', function (done) {
      process.env.NODE_ENV = 'development'
      let infoCalled = false
      const Runner = {
        up: function * (files) {
          return {status:'skipped'}
        }
      }
      Ioc.bind('Adonis/Src/Runner', function () {
        return Runner
      })
      Ioc.bind('Adonis/Src/Ansi', function () {
        return {
          icon: function () {},
          info: function () {
            infoCalled = true
          }
        }
      })
      expect(Run.description).not.equal(undefined)
      expect(Run.signature).not.equal(undefined)

      co(function * () {
        return yield Run.handle({}, {})
      })
      .then(function () {
        expect(infoCalled).to.equal(true)
        done()
      })
      .catch(done)
    })
  })

  context('Rollback', function () {
    it('should throw error when running in production environment', function (done) {
      process.env.NODE_ENV = 'production'
      const Runner = {
        up: function * (files) {
          return {status:'completed'}
        }
      }
      Ioc.bind('Adonis/Src/Runner', function () {
        return Runner
      })
      co(function * () {
        return yield Rollback.handle({}, {})
      })
        .then(function () {})
        .catch(function (error) {
          expect(error.message).to.match(/Cannot run migrations in production/)
          done()
        })
    })

    it('should pass all migrations to runner down method', function (done) {
      process.env.NODE_ENV = 'development'
      let migrations = []
      const Runner = {
        down: function * (files) {
          migrations = files
          return {status:'completed'}
        }
      }
      Ioc.bind('Adonis/Src/Runner', function () {
        return Runner
      })
      Ioc.bind('Adonis/Src/Ansi', function () {
        return {
          icon: function () {},
          info: function () {},
          success: function () {}
        }
      })
      expect(Rollback.description).not.equal(undefined)
      expect(Rollback.signature).not.equal(undefined)

      co(function * () {
        return yield Rollback.handle({}, {})
      })
        .then(function () {
          const basename = path.basename(migName).replace('.js', '')
          Object.keys(migrations).forEach(function (migration) {
            expect(migration).not.equal('.gitkeep')
          })
          done()
        })
        .catch(done)
    })

    it('should handle skipped status', function (done) {
      process.env.NODE_ENV = 'development'
      let infoCalled = false
      const Runner = {
        down: function * (files) {
          return {status:'skipped'}
        }
      }
      Ioc.bind('Adonis/Src/Runner', function () {
        return Runner
      })
      Ioc.bind('Adonis/Src/Ansi', function () {
        return {
          icon: function () {},
          info: function () {
            infoCalled = true
          },
          success: function () {}
        }
      })
      expect(Rollback.description).not.equal(undefined)
      expect(Rollback.signature).not.equal(undefined)

      co(function * () {
        return yield Rollback.handle({}, {})
      })
        .then(function () {
          expect(infoCalled).to.equal(true)
          done()
        })
        .catch(done)
    })
  })
})
