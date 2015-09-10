'use strict';

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const ServiceProvider = require('adonis-fold').ServiceProvider
const Collection = require('../src/Orm/Collection')

class CollectionProvider extends ServiceProvider{

  * register() {
    this.app.bind('Adonis/Src/Collection', function () {
      return Collection;
    })
  }

}

module.exports = CollectionProvider
