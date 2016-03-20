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

class Seed extends Command {

  /**
   * signature to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get signature () {
    return '{--force?} {--files?}'
  }

  /**
   * command description to be used by ace
   *
   * @return {String}
   *
   * @public
   */
  get description () {
    return 'Seeds database by running all or a given seed file'
  }

  /**
   * this method will seed the database by calling
   * all/specific seed files
   *
   * @param  {Object} options
   * @param  {Object} flags
   *
   * @public
   */
  * handle (options, flags) {
    this.checkEnv(flags.force)
    const seedsPath = this.helpers.seedsPath()
    const selectedFiles = flags.files ? flags.files.split(',') : null
    require(this.helpers.databasePath('factory.js'))
    const seedsFiles = this.loadFiles(seedsPath, selectedFiles)

    yield this.seeder.exec(seedsFiles)
    this.ansi.success(`${this.ansi.icon('success')} seeded database successfully`)
  }
}

module.exports = Seed
