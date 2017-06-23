'use strict'

const _ = require('lodash')

class Collection {
  constructor (rows, pages = null, isOne = false) {
    this.rows = rows
    this.pages = pages
    this.isOne = isOne
  }

  first () {
    return _.first(this.rows)
  }

  last () {
    return _.last(this.rows)
  }

  size () {
    return this.isOne ? 1 : this.rows.length
  }

  toJSON () {
    return this.isOne ? this.rows.toObject() : this.rows.map((row) => row.toObject())
  }
}

module.exports = Collection
