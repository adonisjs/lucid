'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const autoLoader = require('auto-loader')
const Ioc = require('adonis-fold').Ioc

let Rollback = exports = module.exports = {}

Rollback.description = 'Rollback migrations executed in last batch'
Rollback.signature = '{--force?}'

/**
 * @description rollback all migrations using
 * runner provider
 * @method handle
 * @param  {Object} options
 * @param  {Object} flags
 * @return {Object}
 * @public
 */
Rollback.handle = function * (options, flags) {
  const Helpers = Ioc.make('Adonis/Src/Helpers')
  const Runner = Ioc.make('Adonis/Src/Runner')
  const migrations = Helpers.migrationsPath()

  if (process.env.NODE_ENV === 'production' && !flags.force) {
    throw new Error('Cannot run migrations in production')
  }
  const migrationsFiles = autoLoader.load(migrations)
  return yield Runner.down(migrationsFiles)
}
