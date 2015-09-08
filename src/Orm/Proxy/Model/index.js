'use strict'

require('harmony-reflect')
const mapper = require('./mapper')
const helpers = require('./helpers')
const Database = require('../Static/database.temporary')
const staticHelpers = require('../Static/helpers')
const _ = require('lodash')

/**
 * @module Model
 * @description Base model to be extended while
 * creating models
 */
class Model {

  constructor (attributes) {

    /**
     * initiating model with array of data is not allowed , as it will
     * be considered as bulk inserts
     */
    if (_.isArray(attributes)) {
      throw new Error('Cannot initiate model with bulk values, use create method for bulk insert')
    }

    /**
     * setting up model attributes and calling setter functions
     * on them before storing
     */
    this.attributes = attributes ? helpers.mutateRow(this, attributes) : {}

    /**
     * creating an isoloted database instance using Database provider
     */
    this.connection = Database.table(this.constructor.table)

    /**
     * returning proxied model instance , it helps in having
     * magical methods.
     */
    return new Proxy(this, mapper)
  }

  /**
   * @function create
   * @description creating a new entry into database using
   * static create method.
   * @param  {Array|Object} values
   * @return {Promise}
   */
  create (values) {
    let isMutated = !values
    values = values || this.attributes
    return this.constructor.create(values, isMutated, this.connection)
  }

  /**
   * @function update
   * @description updating existing model with current attributes
   * or passing new attributes
   * @param  {Array|Object} values
   * @return {Promise}
   */
  update (values) {
    if(!helpers.isFetched(this)){
      throw new Error(`You cannot update a fresh model instance , trying fetching one using find method`)
    }
    let isMutated = !values
    values = values || this.attributes
    return this.constructor.update(values, isMutated, this.connection)
  }

  /**
   * @function delete
   * @description soft deleting or deleting rows based upon
   * model settings
   * @return {Promise}
   */
  delete () {
    if(!helpers.isFetched(this)){
      throw new Error(`You cannot delete a fresh model instance , trying fetching one using find method`)
    }
    return this.constructor.delete(this.connection)
  }

  /**
   * @function forceDelete
   * @description force deleting rows even if soft deletes
   * are enabled
   * @return {Promise}
   */
  forceDelete () {
    if(!helpers.isFetched(this)){
      throw new Error(`You cannot delete a fresh model instance , trying fetching one using find method`)
    }
    return this.constructor.forceDelete(this.connection)
  }

  /**
   * @function isTrashed
   * @description finding whether row has been soft deleted or not
   * @return {Boolean}
   */
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

  /**
   * @function softDeletes
   * @static true
   * @description default field name for soft deletes
   * @return {String}
   */
  static get softDeletes () {
    return 'deleted_at'
  }

  /**
   * @function timestamps
   * @static true
   * @description by default timestamps are enabled
   * on models
   * @return {Boolean}
   */
  static get timestamps () {
    return true
  }

  /**
   * @function table
   * @static true
   * @description default table name for a given model
   * @return {String}
   */
  static get table () {
    return staticHelpers.getTableName(this)
  }

  /**
   * @function primaryKey
   * @static true
   * @description by default id is considered to be the primary key on
   * a model
   * @return {String}
   */
  static get primaryKey(){
    return 'id'
  }

}

module.exports = Model
