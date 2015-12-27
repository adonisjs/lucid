'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class LucidProvider extends ServiceProvider {

  * register () {
    this.app.bind('Adonis/Src/Lucid', function (app) {
      const Database = app.use('Adonis/Src/Database')
      const Lucid = require('../src/Orm/Proxy/Model')
      Lucid.database = Database
      return Lucid
    })
  }

}

module.exports = LucidProvider
