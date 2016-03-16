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

class Refresh extends Command {

  /**
   * command description to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get description () {
    return 'Refresh migrations by dropping and re-running all migrations'
  }

  /**
   * this method will rollback all the migrations and
   * re-run them again from start.
   *
   * @param  {Object} options
   * @param  {Object} flags
   *
   * @public
   */
  * handle (options, flags) {
    this.checkEnv(flags.force)

    const migrationsFiles = this.loadFiles(this.helpers.migrationsPath())
    yield this.migrations.down(migrationsFiles, 0)
    const response = yield this.migrations.up(migrationsFiles)

    const successMessage = 'Migrations successfully refreshed.'
    const infoMessage = 'Already at the latest batch.'
    this.log(response.status, successMessage, infoMessage)
  }
}

module.exports = Refresh
