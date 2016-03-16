'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Schema = use('Adonis/Src/Schema')

class User extends Schema {
  up () {
    this.create('users', function (table) {
      table.increments()
      table.string('username')
      table.string('email')
      table.string('firstname')
      table.string('lastname')
      table.string('password')
      table.timestamps()
    })
  }

  down () {
    this.drop('users')
  }
}

module.exports = User
