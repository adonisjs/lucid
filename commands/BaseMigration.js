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

  /**
   * Throws exception when trying to run migrations are
   * executed in production and not using force flag.
   *
   * @method _validateState
   *
   * @param  {Boolean}       force
   *
   * @return {void}
   *
   * @private
   *
   * @throws {Error} If NODE_ENV is production
   */
  _validateState (force) {
    if (process.env.NODE_ENV === 'production' && !force) {
      throw new Error('Cannot run migrations in production. Use --force flag to continue')
    }
  }

  /**
   * Executes the function when conditional
   * is false
   *
   * @method execIfNot
   *
   * @param {Boolean} conditional
   * @param {Function} fn
   */
  execIfNot (conditional, fn) {
    if (!conditional) {
      fn()
    }
  }
}

module.exports = BaseMigration
