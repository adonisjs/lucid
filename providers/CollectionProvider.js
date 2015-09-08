'use strict';

const ServiceProvider = require('fold').ServiceProvider
const Collection = require('../src/Orm/Collection')

class CollectionProvider extends ServiceProvider{

  * register() {
    this.app.bind('Adonis/Src/Collection', function () {
      return Collection;
    })
  }

}

module.exports = CollectionProvider
