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
const ace = require('@adonisjs/ace')

class MigrationRefresh extends BaseMigration {
  /**
   * Command signature required by ace
   *
   * @method signature
   *
   * @return {String}
   */
  static get signature () {
    return `
    migration:refresh
    { -f, --force: Forcefully run migrations in production }
    { -s, --silent: Silent the migrations output }
    { --seed: Seed the database after migration finished }
    { --log: Log SQL queries instead of executing them }
    { -a, --keep-alive: Do not close the database connection }
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
    return 'Refresh migrations by performing rollback and then running from start'
  }

  /**
   * Method called when command is executed. This method will
   * require all files from the migrations directory
   * and rollback to the first batch and then
   * re-excute the migrations
   *
   * @method handle
   *
   * @param  {Object} args
   * @param  {Boolean} options.log
   * @param  {Boolean} options.force
   * @param  {Boolean} options.silent
   * @param  {Boolean} options.seed
   * @param  {Boolean} options.keepAlive
   *
   * @return {void|Array}
   */
  async handle (args, { log, force, silent, seed, keepAlive }) {
    this._validateState(force)

    if (keepAlive) {
      this.migration.keepAlive()
    }

    await ace.call('migration:reset', {}, { log, force, silent })
    await ace.call('migration:run', {}, { log, force, silent, seed, keepAlive })
  }
}

module.exports = MigrationRefresh
