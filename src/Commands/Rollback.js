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

class Rollback extends Command {

  /**
   * signature to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get signature () {
    return 'migration:rollback {-f,--force?} {-b,--batch?=@value} {--log?:Log SQL queries that will run}'
  }

  /**
   * command description to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get description () {
    return 'Rollback migrations to a given or last batch'
  }

  /**
   * this method will rollback all the migrations to last
   * or a given batch.
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
      const response = yield new MigrationsRunner().down(migrationsFiles, flags.batch, flags.log)

      if (flags.log && !response.status) {
        this._logQueries(response)
        return
      }

      const successMessage = flags.batch ? `Rolled back to ${flags.batch} batch.` : 'Rolled back to previous batch.'
      const infoMessage = 'Already at the latest batch.'
      this._log(response.status, successMessage, infoMessage)
    } catch (e) {
      this.error(e)
    }
  }
}

module.exports = Rollback
