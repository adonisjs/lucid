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
  }

}

module.exports = SchemaProvider
