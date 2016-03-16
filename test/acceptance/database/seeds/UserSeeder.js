'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Factory = use('Adonis/Src/Factory')
class UserSeeder {
  * run () {
    yield Factory.model('App/Model/User').create(5)
  }
}

module.exports = UserSeeder
