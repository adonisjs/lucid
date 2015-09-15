'use strict';

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const ServiceProvider = require('adonis-fold').ServiceProvider

class CollectionProvider extends ServiceProvider{

  * register() {
    this.app.bind('Adonis/Src/Collection', function () {
      return require('../src/Orm/Collection')
    })
  }

}

module.exports = CollectionProvider
