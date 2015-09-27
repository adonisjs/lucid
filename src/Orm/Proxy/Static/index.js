'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

require('harmony-reflect')
const mapper = require('./mapper')
const addons = require('./addons')

/**
 * @module StaticProxy
 * @description Returns proxied defination for a given
 * model class, it helps in creating magical methods
 * out of the box
 */
class StaticProxy {

  constructor (Model, Database) {
    Model.activeConnection = Database.table(Model.table)

    Model._activeRelation = {}
    Model._relations = []
    Model._relationsScope = []

    /**
     * @function create
     * @see addons.create
     * @public
     */
    Model.create = function (values, isMutated, connection) {
      return addons.create(this, values, isMutated, connection)
    }

    /**
     * @function update
     * @see addons.update
     * @public
     */
    Model.update = function (values, isMutated, connection) {
      return addons.update(this, values, isMutated, connection)
    }

    /**
     * @function delete
     * @see addons.delete
     * @public
     */
    Model.delete = function (connection) {
      return addons.delete(this, connection)
    }

    /**
     * @function forceDelete
     * @see addons.forceDelete
     * @public
     */
    Model.forceDelete = function (connection) {
      return addons.forceDelete(this, connection)
    }

    /**
     * @function new
     * @description it makes model chained values back to normal,
     * which is required while making different
     * queries , otherwise knex old query
     * chain will we prepended.
     * @public
     */
    Model.new = function () {
      this.disableSoftDeletes = false
      this._activeRelation = {}
      this._relations = []
      this._relationScope = []
      this.activeConnection = this.database.table(this.table)
      return this
    }

    return new Proxy(Model, mapper)
  }

}

module.exports = StaticProxy
