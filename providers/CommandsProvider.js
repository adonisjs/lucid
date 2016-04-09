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

  constructor () {
    super()
    this.commands = ['Run', 'Rollback', 'Refresh', 'Reset', 'Status']
  }

  * register () {
    this.commands.forEach((command) => {
      this.app.bind(`Adonis/Commands/Migration:${command}`, function (app) {
        const CommandFile = require(`../src/Commands/${command}`)
        const Migrations = app.use('Adonis/Src/Migrations')
        const Helpers = app.use('Adonis/Src/Helpers')
        const Seeder = app.use('Adonis/Src/Seeder')
        return new CommandFile(Helpers, Migrations, Seeder)
      })
    })
    this.app.bind('Adonis/Commands/DB:Seed', function (app) {
      const SeedCommand = require('../src/Commands/Seed')
      const Migrations = app.use('Adonis/Src/Migrations')
      const Helpers = app.use('Adonis/Src/Helpers')
      const Seeder = app.use('Adonis/Src/Seeder')
      return new SeedCommand(Helpers, Migrations, Seeder)
    })
  }
}

module.exports = CommandsProvider
