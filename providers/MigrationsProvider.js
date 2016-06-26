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

class MigrationsProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Src/Migrations', function (app) {
      const Migrations = require('../src/Migrations')
      const Database = app.use('Adonis/Src/Database')
      const Config = app.use('Adonis/Src/Config')
      return new Migrations(Database, Config)
    })
  }
}

module.exports = MigrationsProvider
