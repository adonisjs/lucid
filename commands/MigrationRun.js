'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const BaseMigration = require('./BaseMigration')
const _ = require('lodash')
const prettyHrTime = require('pretty-hrtime')

class MigrationRun extends BaseMigration {
  /**
   * Command signature required by ace
   *
   * @method signature
   *
   * @return {String}
   */
  static get signature () {
    return `
    migration:run
    { -f, --force: Forcefully run migrations in production }
    { -s, --silent: Silent the migrations output }
    { --log: Log SQL queries instead of executing them }
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
    return 'Run all pending migrations'
  }

  /**
   * Method called when command is executed. This method will
   * require all files from the migrations directory
   * and execute all pending schema files
   *
   * @method handle
   *
   * @param  {Object} args
   * @param  {Boolean} options.log
   * @param  {Boolean} options.force
   * @param  {Boolean} options.silent
   *
   * @return {void|Array}
   */
  async handle (args, { log, force, silent }) {
    try {
      this._validateState(force)

      const startTime = process.hrtime()
      const { migrated, status, queries } = await this.migration.up(this._getSchemaFiles(), log)

      /**
       * Tell user that there is nothing to migrate
       */
      if (status === 'skipped') {
        this.execIfNot(silent, () => this.info('Nothing to migrate'))
      }

      /**
       * Log files that been migrated successfully
       */
      if (status === 'completed' && !queries) {
        const endTime = process.hrtime(startTime)
        migrated.forEach((name) => this.execIfNot(silent, () => this.completed('migrate', `${name}.js`)))
        this.success(`Database migrated successfully in ${prettyHrTime(endTime)}`)
      }

      /**
       * If there are queries in the result, just log them
       */
      if (queries) {
        _.each(queries, ({queries, name}) => {
          this.execIfNot(silent, () => console.log(this.chalk.magenta(`\n Queries for ${name}.js`)))
          _.each(queries, (query) => this.execIfNot(silent, () => console.log(`  ${query}`)))
          console.log('\n')
        })
      }

      if (!this.viaAce) {
        return { status, migrated, queries }
      }
    } catch (error) {
      console.log(error)
      process.exit(1)
    }
  }
}

module.exports = MigrationRun
