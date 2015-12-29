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

    this.app.bind('Adonis/Commands/Make', function () {
      return require('../src/Commands/Make')
    })

    this.app.bind('Adonis/Commands/Run', function () {
      return require('../src/Commands/Run')
    })

    this.app.bind('Adonis/Commands/Rollback', function () {
      return require('../src/Commands/Rollback')
    })
  }

}

module.exports = SchemaProvider
