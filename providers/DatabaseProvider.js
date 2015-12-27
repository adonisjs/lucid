'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class DatabaseProvider extends ServiceProvider {

  * register () {
    this.app.singleton('Adonis/Src/Database', function (app) {
      const Config = app.use('Adonis/Src/Config')
      const Database = require('../src/Database')
      return new Database(Config)
    })
  }

}

module.exports = DatabaseProvider
