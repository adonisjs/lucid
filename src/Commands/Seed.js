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
    return 'db:seed {-f,--force?} {--files?}'
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
    try {
      this.checkEnv(flags.force)
      const seedsPath = this.helpers.seedsPath()
      const selectedFiles = flags.files ? flags.files.split(',') : null
      const seedsFiles = this.loadFiles(seedsPath, selectedFiles)
      require(this.helpers.databasePath('factory'))

      yield this.seeder.exec(seedsFiles)
      this.success(`${this.icon('success')} seeded database successfully`)
    } catch (e) {
      this.error(e)
    } finally {
      const MigrationsRunner = this.migrations
      new MigrationsRunner().database.close()
    }
  }
}

module.exports = Seed
