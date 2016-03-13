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

let Rollback = exports = module.exports = {}

Rollback.description = 'Refresh migrations by dropping and re-running all migrations'
Rollback.signature = '{--force?}'

/**
 * rollback all migrations using runner provider
 *
 * @method handle
 *
 * @param  {Object} options
 * @param  {Object} flags
 * @return {Object}
 *
 * @public
 */
Rollback.handle = function * (options, flags) {
  const Helpers = Ioc.make('Adonis/Src/Helpers')
  const Migrations = Ioc.make('Adonis/Src/Migrations')
  const Ansi = Ioc.use('Adonis/Src/Ansi')
  const migrations = Helpers.migrationsPath()

  if (process.env.NODE_ENV === 'production' && !flags.force) {
    throw new Error('Cannot run migrations in production')
  }

  const migrationsFiles = util.loadJsFiles(migrations)
  yield Migrations.down(migrationsFiles, 0)
  const response = yield Migrations.up(migrationsFiles)

  if (response.status === 'completed') {
    const message = flags.batch ? `rolled back to ${flags.batch} batch` : 'rolled back from latest batch'
    Ansi.success(`${Ansi.icon('success')} ${message}`)
  }

  if (response.status === 'skipped') {
    Ansi.info(`${Ansi.icon('info')} already at the last batch`)
  }
}
