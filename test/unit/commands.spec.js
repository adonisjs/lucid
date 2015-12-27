'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

/* global describe, it, before, after, context */

const Make = require('../../src/Commands/Make')
const Run = require('../../src/Commands/Run')
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

describe('Commands', function () {
  before(function () {
    GLOBAL.use = function () {
      return function () {}
    }
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
      const make = new Make(Helpers)
      make.description()
      make.signature()

      make
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
      const run = new Run(Helpers, Runner)

      co(function * () {
        return yield run.handle({}, {})
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
      const run = new Run(Helpers, Runner)
      run.description()
      run.signature()

      co(function * () {
        return yield run.handle({}, {})
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
      const rollback = new Rollback(Helpers, Runner)

      co(function * () {
        return yield rollback.handle({}, {})
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
      const rollback = new Rollback(Helpers, Runner)
      rollback.description()
      rollback.signature()

      co(function * () {
        return yield rollback.handle({}, {})
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
