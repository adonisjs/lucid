'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { Command } = require('@adonisjs/ace')
const requireAll = require('require-all')

class BaseMigration extends Command {
  static get inject () {
    return ['Adonis/Src/Migration', 'Adonis/Src/Helpers']
  }

  constructor (migration, helpers) {
    super()
    this._migrationsPath = helpers.migrationsPath()
    this.migration = migration
  }

  /**
   * Returns an object of all schema files
   *
   * @method _getSchemaFiles
   *
   * @return {Object}
   *
   * @private
   */
  _getSchemaFiles () {
    return requireAll({
      dirname: this._migrationsPath,
      filters: /(.*)\.js$/
    })
  }
}

module.exports = BaseMigration
