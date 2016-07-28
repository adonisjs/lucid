'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Command = require('./Command')

class Status extends Command {

  /**
   * signature to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get signature () {
    return 'migration:status'
  }

  /**
   * command description to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get description () {
    return 'Check migrations current status'
  }

  /**
   * this method will print the migrations current status.
   *
   * @param  {Object} options
   * @param  {Object} flags
   *
   * @public
   */
  * handle (options, flags) {
    const MigrationsRunner = this.migrations
    const migrationsRunner = new MigrationsRunner()
    try {
      const migrationsFiles = this.loadFiles(this.helpers.migrationsPath())
      const response = yield migrationsRunner.status(migrationsFiles)
      this.table(['Migration', 'Status'], response)
    } catch (e) {
      this.error(e)
    }
  }
}

module.exports = Status
