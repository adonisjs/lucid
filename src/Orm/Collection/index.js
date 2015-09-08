'use strict'

const _ = require('lodash')

/**
 * @module Collection
 * @namespace Adonis/Src/Collection
 * @description Convert an array of object of data into
 * lodash collection
 */
class Collection {

  constructor (values) {
    return _(values)
  }

}

module.exports = Collection
