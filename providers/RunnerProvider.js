'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class RunnerProvider extends ServiceProvider {

  * register () {
    this.app.singleton('Adonis/Src/Runner', function (app) {
      const Config = app.use('Adonis/Src/Config')
      const Runner = require('../src/Runner')
      return new Runner(Config)
    })
  }

}

module.exports = RunnerProvider
