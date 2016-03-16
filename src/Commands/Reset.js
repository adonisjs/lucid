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
   * this method will rollback all the migrations latest batch.
   *
   * @param  {Object} options
   * @param  {Object} flags
   *
   * @public
   */
  * handle (options, flags) {
    this.checkEnv(flags.force)

    const selectedFiles = flags.files ? flags.files.split(',') : null
    const migrationsFiles = this.loadFiles(this.helpers.migrationsPath(), selectedFiles)

    const response = yield this.migrations.down(migrationsFiles, 0)

    const successMessage = 'Rolled back to latest batch.'
    const infoMessage = 'Already at the latest batch.'
    this.log(response.status, successMessage, infoMessage)
  }
}

module.exports = Reset
