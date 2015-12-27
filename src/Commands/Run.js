'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const autoLoader = require('auto-loader')
const Ioc = require('adonis-fold').Ioc

class Run {

  constructor () {
    const Helpers = Ioc.make('Adonis/Src/Helpers')
    const Runner = Ioc.make('Adonis/Src/Runner')
    this.migrations = Helpers.migrationsPath()
    this.runner = Runner
  }

  /**
   * @description returns command description
   * @method description
   * @return {String}
   * @public
   */
  description () {
    return 'Run latest migrations'
  }

  /**
   * @description command signature to define expectation for
   * a given command to ace
   * @method signature
   * @return {String}
   * @public
   */
  signature () {
    return '{--force?}'
  }

  /**
   * @description migrate all migrations using runner
   * provider
   * @method handle
   * @param  {Object} options
   * @param  {Object} flags
   * @return {Object}
   * @public
   */
  * handle (options, flags) {
    if (process.env.NODE_ENV === 'production' && !flags.force) {
      throw new Error('Cannot run migrations in production')
    }
    const migrationsFiles = autoLoader.load(this.migrations)
    return yield this.runner.up(migrationsFiles)
  }

}

module.exports = Run
