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
describe('Commands', function () {
  before(function (done) {
    GLOBAL.use = function () {
      return function () {}
    }
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
    it('should create a file inside migrations directory', function (done) {
      expect(Make.description).not.equal(undefined)
      expect(Make.signature).not.equal(undefined)

      Make
        .handle({name: 'create_users_table'})
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
  })

  context('Run', function () {
    it('should throw error when running in production environment', function (done) {
      process.env.NODE_ENV = 'production'
      const Runner = {
        up: function * (files) {}
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
  })

  context('Rollback', function () {
    it('should throw error when running in production environment', function (done) {
      process.env.NODE_ENV = 'production'
      const Runner = {
        up: function * (files) {}
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
        }
      }
      Ioc.bind('Adonis/Src/Runner', function () {
        return Runner
      })
      expect(Rollback.description).not.equal(undefined)
      expect(Rollback.signature).not.equal(undefined)

      co(function * () {
        return yield Rollback.handle({}, {})
      })
        .then(function () {
          const basename = path.basename(migName).replace('.js', '')
          expect(migrations).to.have.property(basename)
          done()
        })
        .catch(done)
    })
  })
})
