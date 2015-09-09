'use strict';

const ServiceProvider = require('adonis-fold').ServiceProvider
const Lucid = require('../src/Orm/Proxy/Model')

class LucidProvider extends ServiceProvider{

  static get inject(){
    return ["Adonis/Src/Database"]
  }

  * register() {
    this.app.bind('Adonis/Src/Lucid', function (Database) {
      Lucid.database = Database
      return Lucid
    })
  }

}

module.exports = LucidProvider
