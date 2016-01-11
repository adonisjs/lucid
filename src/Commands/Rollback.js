'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const autoLoader = require('auto-loader')
const Ioc = require('adonis-fold').Ioc
const _ = require('lodash')

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
Rollback.handle = function *(options, flags) {
  const Helpers = Ioc.make('Adonis/Src/Helpers')
  const Runner = Ioc.make('Adonis/Src/Runner')
  const Ansi = Ioc.use('Adonis/Src/Ansi')
  const migrations = Helpers.migrationsPath()

  if (process.env.NODE_ENV === 'production' && !flags.force) {
    throw new Error('Cannot run migrations in production')
  }

  /**
   * filters only files ending with .js
   */
  const migrationsFiles = _.object(_.compact(_.map(autoLoader.load(migrations), function (file, name) {
    if (name.endsWith('.js')) {
      return [name.replace('.js', ''), file]
    }
  })))

  const response = yield Runner.down(migrationsFiles)
  if (response.status === 'completed') {
    Ansi.success(Ansi.icon('success') + ' latest migrations batch has been rolled back')
  }

  if (response.status === 'skipped') {
    Ansi.info(Ansi.icon('info') + ' already at the last batch')
  }
}
