'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const proxy = require('./proxy')
require('harmony-reflect')

class Schema {

  constructor () {
    this.store = {}
    return new Proxy(this, proxy)
  }

}

module.exports = Schema
