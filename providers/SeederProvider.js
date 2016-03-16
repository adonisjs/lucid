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

class SeedsProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Src/Seeder', function () {
      return require('../src/Seeder')
    })
  }
}

module.exports = SeedsProvider
