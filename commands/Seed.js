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
const _ = require('lodash')
const { ioc } = require('@adonisjs/fold')
const prettyHrTime = require('pretty-hrtime')

class SeedDatabase extends Command {
  constructor (Helpers, Database) {
    super()
    this._seedsPath = Helpers.seedsPath()
    this.Database = Database
  }

  /**
   * IoC container injections
   *
   * @method inject
   *
   * @return {Array}
   */
  static get inject () {
    return ['Adonis/Src/Helpers', 'Adonis/Src/Database']
  }

  /**
   * Returns an object of all schema files
   *
   * @method _getSeedFiles
   *
   * @return {Object}
   *
   * @private
   */
  _getSeedFiles (selectedFiles) {
    return requireAll({
      dirname: this._seedsPath,
      filter: (fileName) => {
        if (!selectedFiles && fileName.match(/(.*)\.js$/)) {
          return fileName
        }

        return _.find(selectedFiles, (file) => file.trim().endsWith(fileName))
      }
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
      throw new Error('Cannot run seeds in production. Use --force flag to continue')
    }
  }

  /**
   * Command signature required by ace
   *
   * @method signature
   *
   * @return {String}
   */
  static get signature () {
    return `
    seed
    { -f, --force: Forcefully seed database in production }
    { -a, --keep-alive: Do not close database connection when seeder.run finishes }
    { --files=@value: Run only selected files }
    `
  }

  /**
   * Command description
   *
   * @method description
   *
   * @return {String}
   */
  static get description () {
    return 'Seed database using seed files'
  }

  /**
   * Method called when command is executed. This method will
   * require all files from the migrations directory
   * and execute all pending schema files
   *
   * @method handle
   *
   * @param  {Object} args
   * @param  {Boolean} options.force
   * @param  {String} options.files
   * @param  {String} options.keepAlive
   *
   * @return {void|Array}
   */
  async handle (args, { force, files, keepAlive }) {
    try {
      this._validateState(force)

      const startTime = process.hrtime()

      files = typeof (files) === 'string' ? files.split(',') : null
      const allFiles = this._getSeedFiles(files)

      if (!_.size(allFiles)) {
        return this.viaAce ? this.info('Nothing to seed') : 'Nothing to seed'
      }

      for (const file of _.keys(allFiles)) {
        const seedInstance = ioc.make(allFiles[file])
        if (typeof (seedInstance.run) === 'function') {
          await seedInstance.run()
        } else {
          this.warn(`${seedInstance.constructor.name} does not have a run method`)
        }
      }

      const endTime = process.hrtime(startTime)
      this.success(`Seeded database in ${prettyHrTime(endTime)}`)
    } catch (error) {
      console.log(error)
    }

    /**
     * Close the connection when seeder are executed and keep alive is
     * not passed
     */
    if (!keepAlive) {
      this.Database.close()
    }
  }
}

module.exports = SeedDatabase
