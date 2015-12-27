'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class SchemaProvider extends ServiceProvider {

  * register () {
    this.app.bind('Adonis/Src/Schema', function () {
      return require('../src/Schema')
    })

    this.app.bind('Adonis/Commands/Make', function (app) {
      const Helpers = app.use('Adonis/Src/Helpers')
      const Make = require('../src/Commands/Make')
      return new Make(Helpers)
    })

    this.app.bind('Adonis/Commands/Run', function (app) {
      const Helpers = app.use('Adonis/Src/Helpers')
      const Runner = app.use('Adonis/Src/Runner')
      const Run = require('../src/Commands/Run')
      return new Run(Helpers, Runner)
    })

    this.app.bind('Adonis/Commands/Rollback', function (app) {
      const Helpers = app.use('Adonis/Src/Helpers')
      const Runner = app.use('Adonis/Src/Runner')
      const Rollback = require('../src/Commands/Rollback')
      return new Rollback(Helpers, Runner)
    })
  }

}

module.exports = SchemaProvider
