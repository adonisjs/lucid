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
const Ioc = require('adonis-fold').Ioc
const CE = require('../Exceptions')
const BaseCommand = Ioc.use('Adonis/Src/Command')

class Command extends BaseCommand {

  constructor (Helpers, Migrations, Seeder) {
    super()
    this.helpers = Helpers
    this.migrations = Migrations
    this.seeder = Seeder
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
      throw CE.DomainException.unsafeEnv('Cannot run migrations in production. Use --force flag to continue')
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
  _log (status, successMessage, infoMessage) {
    if (status === 'completed') {
      this.success(`${this.icon('success')} ${successMessage}`)
      return
    }
    if (status === 'skipped') {
      this.info(`${this.icon('info')} ${infoMessage}`)
    }
  }

  /**
   * logs queries to the stdout using console.log
   *
   * @param   {Array} output
   *
   * @private
   */
  _logQueries (output) {
    output.forEach((item) => {
      this.success(`\n${item.file}`)
      item.queries.forEach((query) => this.log(`>SQL: ${query}`))
    })
  }

}

module.exports = Command
