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

class Run extends Command {

  /**
   * signature to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get signature () {
    return 'migration:run {-f,--force?} {--files?} {--log?:Log SQL queries that will run}'
  }

  /**
   * command description to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get description () {
    return 'Run all pending migrations'
  }

  /**
   * this method will run all pending migrations
   *
   * @param  {Object} options
   * @param  {Object} flags
   *
   * @public
   */
  * handle (options, flags) {
    try {
      this.checkEnv(flags.force)

      const selectedFiles = flags.files ? flags.files.split(',') : null
      const migrationsFiles = this.loadFiles(this.helpers.migrationsPath(), selectedFiles)
      const MigrationsRunner = this.migrations
      const response = yield new MigrationsRunner().up(migrationsFiles, flags.log)

      if (flags.log && !response.status) {
        this._logQueries(response)
        return
      }

      const successMessage = 'Database migrated successfully.'
      const infoMessage = 'Nothing to migrate.'
      this._log(response.status, successMessage, infoMessage)
    } catch (e) {
      this.error(e)
    }
  }
}

module.exports = Run
