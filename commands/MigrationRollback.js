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

class MirationRollback extends BaseMigration {
  /**
   * Command signature required by ace
   *
   * @method signature
   *
   * @return {String}
   */
  static get signature () {
    return `
    migration:rollback
    { -b, --batch=@value: Rollback upto a specific batch number }
    { -f, --force: Forcefully run migrations in production }
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
    return 'Rollback migration to latest batch or to a specific batch number'
  }

  /**
   * Method called when command is executed. This method will
   * require all files from the migrations directory
   * and rollback to a specific batch
   *
   * @method handle
   *
   * @param  {Object} args
   * @param  {Boolean} options.log
   * @param  {Boolean} options.force
   * @param  {Number} options.batch
   *
   * @return {void|Array}
   */
  async handle (args, { log, force, batch }) {
    batch = batch ? Number(batch) : null

    this._validateState(force)

    const { migrated, status, queries } = await this.migration.down(this._getSchemaFiles(), batch, log)

    /**
     * Tell user that there is nothing to migrate
     */
    if (status === 'skipped') {
      this.info('Already at the last batch')
    }

    /**
     * Log files that been migrated successfully
     */
    if (status === 'completed' && !queries) {
      migrated.forEach((name) => this.completed('rollback', `${name}.js`))
    }

    /**
     * If there are queries in the result, just log them
     */
    if (queries) {
      _.each(queries, ({queries, name}) => {
        console.log(this.chalk.magenta(`\n Queries for ${name}.js`))
        _.each(queries, (query) => console.log(`  ${query}`))
        console.log('\n')
      })
    }

    if (!this.viaAce) {
      return { status, migrated, queries }
    }
  }
}

module.exports = MirationRollback
