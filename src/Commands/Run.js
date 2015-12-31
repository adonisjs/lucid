'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const autoLoader = require('auto-loader')
const Ioc = require('adonis-fold').Ioc

let Run = exports = module.exports = {}

Run.description = 'Run latest migrations'
Run.signature = '{--force?}'

/**
 * @description rollback all migrations using
 * runner provider
 * @method handle
 * @param  {Object} options
 * @param  {Object} flags
 * @return {Object}
 * @public
 */
Run.handle = function * (options, flags) {
  const Helpers = Ioc.make('Adonis/Src/Helpers')
  const Runner = Ioc.make('Adonis/Src/Runner')
  const Ansi = Ioc.use('Adonis/Src/Ansi')
  const migrations = Helpers.migrationsPath()

  if (process.env.NODE_ENV === 'production' && !flags.force) {
    throw new Error('Cannot run migrations in production')
  }
  const migrationsFiles = autoLoader.load(migrations)
  const response = yield Runner.up(migrationsFiles)

  if (response.status === 'completed') {
    Ansi.success(Ansi.icon('success') + ' database migrated successfully')
  }

  if (response.status === 'skipped') {
    Ansi.info(Ansi.icon('info') + ' already the latest version')
  }
}
