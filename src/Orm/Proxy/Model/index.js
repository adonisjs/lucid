'use strict'

require('harmony-reflect')
const mapper = require('./mapper')
const helpers = require('./helpers')
const Database = require('../Static/database.temporary')
const staticHelpers = require('../Static/helpers')
const _ = require('lodash')

class Model {

  constructor (attributes) {
    if (_.isArray(attributes)) {
      throw new Error('Cannot initiate model with bulk values, use create method for bulk insert')
    }
    this.attributes = attributes ? helpers.mutateRow(this, attributes) : {}
    this.connection = Database.table(this.constructor.table)
    return new Proxy(this, mapper)
  }

  create (values) {
    let isMutated = !values
    values = values || this.attributes
    return this.constructor.create(values, isMutated, this.connection)
  }

  update (values) {
    let isMutated = !values
    values = values || this.attributes
    return this.constructor.update(values, isMutated, this.connection)
  }

  delete () {
    return this.constructor.delete(this.connection)
  }

  forceDelete () {
    return this.constructor.forceDelete(this.connection)
  }

  isTrashed () {
    const softDeleteKey = this.constructor.softDeletes
    if (!softDeleteKey) {
      return false
    }
    if (this.attributes && this.attributes[softDeleteKey] && this.attributes[softDeleteKey] !== null) {
      return true
    }
    return false
  }

  static get softDeletes () {
    return 'deleted_at'
  }

  static get timestamps () {
    return true
  }

  static get table () {
    return staticHelpers.getTableName(this)
  }

}

module.exports = Model
