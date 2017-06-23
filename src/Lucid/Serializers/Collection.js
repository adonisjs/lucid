'use strict'

class Collection {
  constructor (rows, pages = null, isOne = false) {
    this.rows = rows
    this.pages = pages
    this.isOne = isOne
  }

  first () {
    return this.rows[0]
  }

  size () {
    return this.isOne ? 1 : this.rows.length
  }

  toJSON () {
    return this.isOne ? this.rows.toObject() : this.rows.map((row) => row.toObject())
  }
}

module.exports = Collection
