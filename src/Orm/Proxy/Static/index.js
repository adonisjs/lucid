'use strict'

require('harmony-reflect')
const mapper = require('./mapper')
const addons = require('./addons')
const Database = require('./database.temporary')

/**
 * @module StaticProxy
 * @description Returns proxied defination for a given
 * model class, it helps in creating magical methods
 * out of the box
 */
class StaticProxy {

  constructor (Model) {
    Model.activeConnection = Database.table(Model.table)

    Model.create = function (values, isMutated, connection) {
      return addons.create(Model, values, isMutated, connection)
    }

    Model.update = function (values, isMutated, connection) {
      return addons.update(Model, values, isMutated, connection)
    }

    Model.delete = function (connection) {
      return addons.delete(Model, connection)
    }

    Model.forceDelete = function (connection) {
      return addons.forceDelete(Model, connection)
    }

    return new Proxy(Model, mapper)
  }

}

module.exports = StaticProxy
