'use strict';

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class LucidProvider extends ServiceProvider{

  static get inject(){
    return ["Adonis/Src/Database"]
  }

  * register() {
    this.app.bind('Adonis/Src/Lucid', function (Database) {
      const Lucid = require('../src/Orm/Proxy/Model')
      Lucid.database = Database
      return Lucid
    })
  }

}

module.exports = LucidProvider
