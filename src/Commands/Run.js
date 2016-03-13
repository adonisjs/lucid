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

let Run = exports = module.exports = {}

Run.description = 'Run all pending migrations'
Run.signature = '{--force?}'

/**
 * run all pending migrations
 *
 * @method handle
 *
 * @param  {Object} options
 * @param  {Object} flags
 * @return {Object}
 *
 * @public
 */
Run.handle = function * (options, flags) {
  const Helpers = Ioc.make('Adonis/Src/Helpers')
  const Migrations = Ioc.make('Adonis/Src/Migrations')
  const Ansi = Ioc.use('Adonis/Src/Ansi')
  const migrations = Helpers.migrationsPath()

  if (process.env.NODE_ENV === 'production' && !flags.force) {
    throw new Error('Cannot run migrations in production')
  }

  const migrationsFiles = util.loadJsFiles(migrations)
  const response = yield Migrations.up(migrationsFiles)

  if (response.status === 'completed') {
    Ansi.success(`${Ansi.icon('success')} database migrated successfully`)
  }

  if (response.status === 'skipped') {
    Ansi.info(`${Ansi.icon('info')} nothing to migrate`)
  }
}
