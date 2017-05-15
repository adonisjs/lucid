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

class RelationProvider extends ServiceProvider {
  * register () {
    this.app.bind('Adonis/Src/Relation', function () {
      return require('../src/Lucid/Relations/Relation')
    })
  }
}

module.exports = RelationProvider
