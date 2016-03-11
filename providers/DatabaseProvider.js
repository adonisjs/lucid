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

class DatabaseProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Src/Database', function (app) {
      const Database = require('../src/Database')
      Database._setConfigProvider(app.use('Adonis/Src/Config'))
      return Database
    })
  }
}
module.exports = DatabaseProvider
