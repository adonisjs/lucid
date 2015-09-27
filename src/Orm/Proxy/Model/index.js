'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

require('harmony-reflect')
const mapper = require('./mapper')
const helpers = require('./helpers')
const StaticProxy = require('../Static')
const Ioc = require('adonis-fold').Ioc
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
    this.connection = this.constructor.database.table(this.constructor.table)

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
   * @public
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
   * @public
   */
  update (values) {
    if (!helpers.isFetched(this)) {
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
   * @public
   */
  delete () {
    if (!helpers.isFetched(this)) {
      throw new Error(`You cannot delete a fresh model instance , trying fetching one using find method`)
    }
    return this.constructor.delete(this.connection)
  }

  /**
   * @function forceDelete
   * @description force deleting rows even if soft deletes
   * are enabled
   * @return {Promise}
   * @public
   */
  forceDelete () {
    let self = this
    if (!helpers.isFetched(this)) {
      throw new Error(`You cannot delete a fresh model instance , trying fetching one using find method`)
    }
    return new Promise(function (resolve, reject) {
      self
        .constructor
        .forceDelete(self.connection)
        .then(function (response) {
          self.attributes = {}
          self.connection = self.constructor.database.table(self.constructor.table)
          resolve(response)
        })
        .catch(reject)
    })
  }

  /**
   * @function isTrashed
   * @description finding whether row has been soft deleted or not
   * @return {Boolean}
   * @public
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
   * @public
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
   * @public
   */
  static get timestamps () {
    return true
  }

  /**
   * @function table
   * @static true
   * @description default table name for a given model
   * @return {String}
   * @public
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
   * @public
   */
  static get primaryKey () {
    return 'id'
  }

  /**
   * hooks are used by ioc container to transform return
   * value and here we want to return proxied model
   * @return {Array}
   * @public
   */
  static get hooks () {
    return ['extend']
  }

  /**
   * @function extend
   * @description extending static interface of class via StaticProxy
   * @return {Object}
   * @public
   */
  static extend () {
    return new StaticProxy(this, this.database)
  }

  /**
   * @getter
   * database instance for this model
   * @public
   */
  static get database () {
    return this._database
  }

  /**
   * @setter
   * database instance for this model
   * @public
   */
  static set database (database) {
    this._database = database
  }

  /**
   * @function query
   * @description query chain that can be executed on relationship
   * definations
   * @param  {Function} callback
   * @return {Object}
   */
  query (callback) {
    this.constructor._activeRelation.query = callback
    return this
  }


  /**
   * @function withPivot
   * @description method to define columns to be selected on pivot 
   * table with many to many relations
   * @return {Object}
   */
  withPivot () {
    this.constructor._activeRelation.withPivot = arguments
    return this
  }

  /**
   * returns defination for hasOne relation
   * @param  {String}  binding
   * @param  {String}  primaryId
   * @param  {String}  relationPrimaryId
   * @return {Object}
   */
  hasOne(binding, targetPrimaryKey, relationPrimaryKey){

    /**
     * grabs model from Ioc container
     * @type {Object}
    */
    const model = Ioc.use(binding)

    /**
     * primary id for the target model, the one
     * who has defined relationship
     * @type {String}
     */
    targetPrimaryKey = targetPrimaryKey || this.constructor.primaryKey

    /**
     * relationship primary key to be used on relation model
     * @type {String}
     */
    relationPrimaryKey = relationPrimaryKey || staticHelpers.getRelationKey(this)

    this.constructor._activeRelation = {model, targetPrimaryKey, relationPrimaryKey, relation:'hasOne'}

    return this

  }


  /**
   * @function belongsTo
   * @description belongsTo defines one to one relation from relation
   * model to host model.
   * @method belongsTo
   * @param  {String}  binding
   * @param  {String}  targetPrimaryKey
   * @param  {String}  relationPrimaryKey
   * @return {Object}
   */
  belongsTo(binding, targetPrimaryKey, relationPrimaryKey) {

    /**
     * grabs model from Ioc container
     * @type {Object}
    */
    const model  = Ioc.use(binding)

    /**
     * relationship primary key to be used on relation model
     * @type {String}
     */
    relationPrimaryKey = relationPrimaryKey || model.primaryKey

    /**
     * primary id for the target model, the one
     * who has defined relationship
     * @type {String}
     */
    targetPrimaryKey = targetPrimaryKey || staticHelpers.getRelationKey(model,true)

    this.constructor._activeRelation = {model, targetPrimaryKey, relationPrimaryKey, relation:'belongsTo'}
    return this

  }


  /**
   * returns defination for hasMany relation
   * @param  {String}  binding
   * @param  {String}  primaryId
   * @param  {String}  relationPrimaryId
   * @return {Object}
   */
  hasMany(binding, targetPrimaryKey, relationPrimaryKey){

    /**
     * grabs model from Ioc container
     * @type {Object}
    */
    const model = Ioc.use(binding)

    /**
     * primary id for the target model, the one
     * who has defined relationship
     * @type {String}
     */
    targetPrimaryKey = targetPrimaryKey || this.constructor.primaryKey

    /**
     * relationship primary key to be used on relation model
     * @type {String}
     */
    relationPrimaryKey = relationPrimaryKey || staticHelpers.getRelationKey(this)

    this.constructor._activeRelation = {model, targetPrimaryKey, relationPrimaryKey, relation:'hasMany'}

  }


  belongsToMany (binding, pivotTable, pivotPrimaryKey, pivotOtherKey) {

    /**
     * grabs model from Ioc container
     * @type {Object}
    */
    const model = Ioc.use(binding)

    /**
     * make target table to be used as pivot table
     * for relationship
     * @type {String}
     */
    pivotTable = pivotTable || staticHelpers.getPivotTableName(this.constructor.table,model.table)

    /**
     * setting up primary key for target model
     * @type {String}
     */
    pivotPrimaryKey = pivotPrimaryKey || staticHelpers.getRelationKey(this)

    /**
     * setting up primary key for relation model
     * @type {String}
     */
    pivotOtherKey = pivotOtherKey || staticHelpers.getRelationKey(model, true)

    const targetPrimaryKey = this.constructor.primaryKey
    const relationPrimaryKey = model.primaryKey

    this.constructor._activeRelation = { model, pivotTable, pivotPrimaryKey, pivotOtherKey, targetPrimaryKey, relationPrimaryKey, relation:'belongsToMany'}

    return this

  }

}

module.exports = Model
