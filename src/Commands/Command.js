'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const util = require('../../lib/util')

class Command {

  constructor (Helpers, Migrations, Seeder, Ansi) {
    this.helpers = Helpers
    this.migrations = Migrations
    this.seeder = Seeder
    this.ansi = Ansi
  }

  /**
   * injections from IoC container required to
   * be injected inside the contructor
   *
   * @return {Array}
   *
   * @public
   */
  static get inject () {
    return ['Adonis/Src/Helpers', 'Adonis/Src/Migrations', 'Adonis/Src/Ansi']
  }

  /**
   * command signature, should be override by
   * the child class
   *
   * @return {String}
   *
   * @public
   */
  get signature () {
    return '{--f|force?}'
  }

  /**
   * command description, should be override by
   * the child class
   *
   * @return {String}
   *
   * @public
   */
  get description () {
    return null
  }

  /**
   * load js files from a given directory.
   *
   * @param  {String}  fromPath
   * @param  {Array}  onlyFiles
   * @return {Object}
   *
   * @public
   */
  loadFiles (fromPath, onlyFiles) {
    return util.loadJsFiles(fromPath, onlyFiles)
  }

  /**
   * checks for env and makes sure migration commands
   * are only ran when env is not production or
   * force flag is passed.
   *
   * @param  {Boolean} force
   *
   * @public
   */
  checkEnv (force) {
    if (process.env.NODE_ENV === 'production' && !force) {
      throw new Error('Cannot run migrations in production. Use --force flag to continue')
    }
  }

  /**
   * logs command messages to the console, based upon the
   * status returned from a given command
   *
   * @param  {String} status
   * @param  {String} successMessage
   * @param  {String} infoMessage
   *
   * @public
   */
  log (status, successMessage, infoMessage) {
    if (status === 'completed') {
      this.ansi.success(`${this.ansi.icon('success')} ${successMessage}`)
      return
    }
    if (status === 'skipped') {
      this.ansi.info(`${this.ansi.icon('info')} ${infoMessage}`)
    }
  }
}

module.exports = Command
