'use strict';

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const ServiceProvider = require('adonis-fold').ServiceProvider
const Database = require('../src/Database')

class DatabaseProvider extends ServiceProvider{

  static get inject(){
    return ["Adonis/Src/Env", "Adonis/Addons/Config"]
  }

  * register() {
    this.app.singleton('Adonis/Src/Database', function (Env,Config) {
      return new Database(Env,Config)
    })
  }

}

module.exports = DatabaseProvider
