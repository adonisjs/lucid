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

class SchemaProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Src/Schema', function (app) {
      return require('../src/Schema')
    })
  }
}

module.exports = SchemaProvider
