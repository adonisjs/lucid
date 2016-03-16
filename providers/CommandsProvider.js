'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class CommandsProvider extends ServiceProvider {
  * register () {
    this.bindRun()
    this.bindRollback()
    this.bindRefresh()
    this.bindReset()
    this.bindSeed()
  }

  bindRun () {
    this.app.bind('Adonis/Commands/Run', function (app) {
      const Run = require('../src/Commands/Run')
      const Helpers = app.use('Adonis/Src/Helpers')
      const Migrations = app.use('Adonis/Src/Migrations')
      const Ansi = app.use('Adonis/Src/Ansi')
      return new Run(Helpers, Migrations, {}, Ansi)
    })
  }

  bindRollback () {
    this.app.bind('Adonis/Commands/Rollback', function (app) {
      const Rollback = require('../src/Commands/Rollback')
      const Helpers = app.use('Adonis/Src/Helpers')
      const Migrations = app.use('Adonis/Src/Migrations')
      const Ansi = app.use('Adonis/Src/Ansi')
      return new Rollback(Helpers, Migrations, {}, Ansi)
    })
  }

  bindRefresh () {
    this.app.bind('Adonis/Commands/Refresh', function (app) {
      const Refresh = require('../src/Commands/Refresh')
      const Helpers = app.use('Adonis/Src/Helpers')
      const Migrations = app.use('Adonis/Src/Migrations')
      const Ansi = app.use('Adonis/Src/Ansi')
      return new Refresh(Helpers, Migrations, {}, Ansi)
    })
  }

  bindReset () {
    this.app.bind('Adonis/Commands/Reset', function (app) {
      const Reset = require('../src/Commands/Reset')
      const Helpers = app.use('Adonis/Src/Helpers')
      const Migrations = app.use('Adonis/Src/Migrations')
      const Ansi = app.use('Adonis/Src/Ansi')
      return new Reset(Helpers, Migrations, {}, Ansi)
    })
  }

  bindSeed () {
    this.app.bind('Adonis/Commands/Seed', function (app) {
      const Seed = require('../src/Commands/Seed')
      const Helpers = app.use('Adonis/Src/Helpers')
      const Seeder = app.use('Adonis/Src/Seeder')
      const Ansi = app.use('Adonis/Src/Ansi')
      return new Seed(Helpers, {}, Seeder, Ansi)
    })
  }
}

module.exports = CommandsProvider
