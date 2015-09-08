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

    /**
     * @function create
     * @see addons.create
     */
    Model.create = function (values, isMutated, connection) {
      return addons.create(Model, values, isMutated, connection)
    }

    /**
     * @function update
     * @see addons.update
     */
    Model.update = function (values, isMutated, connection) {
      return addons.update(Model, values, isMutated, connection)
    }

    /**
     * @function delete
     * @see addons.delete
     */
    Model.delete = function (connection) {
      return addons.delete(Model, connection)
    }

    /**
     * @function forceDelete
     * @see addons.forceDelete
     */
    Model.forceDelete = function (connection) {
      return addons.forceDelete(Model, connection)
    }

    /**
     * it makes model chained values back to normal,
     * which is required while making different
     * queries , otherwise knex old query
     * chain will we prepended.
     */
    Model.new = function () {
      Model.disableSoftDeletes = false
      Model.activeConnection._statements = []
    }

    return new Proxy(Model, mapper)
  }

}

module.exports = StaticProxy
