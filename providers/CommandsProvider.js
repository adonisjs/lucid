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
    this.commands = ['Run', 'Rollback', 'Refresh', 'Reset', 'Seed', 'Status']
  }

  * register () {
    this.commands.forEach((command) => {
      this.app.bind(`Adonis/Commands/${command}`, function (app) {
        const CommandFile = require(`../src/Commands/${command}`)
        const Migrations = app.use('Adonis/Src/Migrations')
        const Helpers = app.use('Adonis/Src/Helpers')
        const Seeder = app.use('Adonis/Src/Seeder')
        return new CommandFile(Helpers, Migrations, Seeder)
      })
    })
  }
}

module.exports = CommandsProvider
