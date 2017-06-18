'use strict'

class Collection {
  constructor (rows, isOne = false) {
    this.rows = rows
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
