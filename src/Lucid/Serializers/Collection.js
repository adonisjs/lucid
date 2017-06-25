'use strict'

const _ = require('lodash')

class Collection {
  constructor (rows, pages = null, isOne = false) {
    this.rows = rows
    this.pages = pages
    this.isOne = isOne
  }

  _attachRelations (modelInstance, output) {
    _.each(modelInstance.$relations, (values, relation) => {
      output[relation] = values && values.toJSON ? values.toJSON() : values
    })
  }

  _attachMeta (modelInstance, output) {
    if (_.size(modelInstance.$sideLoaded)) {
      output.__meta__ = _.clone(modelInstance.$sideLoaded)
    }
  }

  _getRowJSON (row) {
    const json = row.toObject()
    this._attachRelations(row, json)
    this._attachMeta(row, json)
    return json
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
    if (this.isOne) {
      return this._getRowJSON(this.rows)
    }
    const data = this.rows.map(this._getRowJSON.bind(this))
    if (this.pages) {
      return _.merge({}, this.pages, { data })
    }
    return data
  }
}

module.exports = Collection
