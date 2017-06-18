'use strict'

class Collection {
  constructor (rows, isOne = false) {
    this.rows = rows
    this.isOne = isOne
  }

  first () {
    return this.rows[0]
  }

  toJSON () {
    return this.rows.map((row) => row.toJSON())
  }
}

module.exports = Collection
