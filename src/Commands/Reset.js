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

class Reset extends Command {

  /**
   * signature to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get signature () {
    return 'migration:reset {-f,--force?} {--log?:Log SQL queries that will run}'
  }

  /**
   * command description to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get description () {
    return 'Reset migrations to lastest batch'
  }

  /**
   * this method will rollback all the migrations latest batch.
   *
   * @param  {Object} options
   * @param  {Object} flags
   *
   * @public
   */
  * handle (options, flags) {
    try {
      this.checkEnv(flags.force)

      const migrationsFiles = this.loadFiles(this.helpers.migrationsPath())
      const MigrationsRunner = this.migrations
      const response = yield new MigrationsRunner().down(migrationsFiles, 0, flags.log)

      if (flags.log && !response.status) {
        this._logQueries(response)
        return
      }

      const successMessage = 'Rolled back to latest batch.'
      const infoMessage = 'Already at the latest batch.'
      this._log(response.status, successMessage, infoMessage)
    } catch (e) {
      this.error(e)
    }
  }
}

module.exports = Reset
