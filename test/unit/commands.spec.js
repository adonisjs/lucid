'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/
/* global describe, it, before, after, context */

const Run = require('../../src/Commands/Run')
const Rollback = require('../../src/Commands/Rollback')
const Ioc = require('adonis-fold').Ioc
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

  context('Run', function () {
    it('should throw error when running in production environment', function (done) {
      process.env.NODE_ENV = 'production'
      const Migrations = {
        up: function * (files) {
          return {status: 'completed'}
        }
      }
      Ioc.bind('Adonis/Src/Migrations', function () {
        return Migrations
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

    it('should handle skipped status', function (done) {
      process.env.NODE_ENV = 'development'
      let infoCalled = false
      const Migrations = {
        up: function * (files) {
          return {status: 'skipped'}
        }
      }
      Ioc.bind('Adonis/Src/Migrations', function () {
        return Migrations
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
      const Migrations = {
        up: function * (files) {
          return {status: 'completed'}
        }
      }
      Ioc.bind('Adonis/Src/Migrations', function () {
        return Migrations
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
      const Migrations = {
        down: function * (files) {
          migrations = files
          return {status: 'completed'}
        }
      }
      Ioc.bind('Adonis/Src/Migrations', function () {
        return Migrations
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
      const Migrations = {
        down: function * (files) {
          return {status: 'skipped'}
        }
      }
      Ioc.bind('Adonis/Src/Migrations', function () {
        return Migrations
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
