'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

/**
 * required to make proxy api stable
 * as of latest spec by ES6
 */
require('harmony-reflect')

const proxy = require('./proxy')
const helpers = require('./helpers')
const StaticProxy = require('../Static')
const Ioc = require('adonis-fold').Ioc
const staticHelpers = require('../Static/helpers')
const _ = require('lodash')
const Collection = require('../../Collection')

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
    return new Proxy(this, proxy)
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

    /**
     * here we consume the create method on model
     * constructor but makes sure to set it back
     * as primary key on model instance.
     */
    return new Promise((resolve,reject) => {

      /**
       * throw an error if trying to save multiple
       * rows via model instance
       */
      if(values && _.isArray(values)){
        return reject(new Error('cannot persist model with multiple rows'))
      }

      let isMutated = !values
      values = values || this.attributes

      this.constructor
      .create(values, isMutated, this.connection)
      .then ((response) => {
        if(response[0]){
          this.attributes = helpers.mutateRow(this,values)
          this.attributes[this.constructor.primaryKey] = response[0]
        }
        resolve(response)
      }).catch(reject)
    })

  }

  /**
   * @function update
   * @description updating existing model with current attributes
   * or passing new attributes
   * @param  {Array|Object} values
   * @return {Promise}
   * @public
   */
  update () {
    if (!helpers.isFetched(this)) {
      throw new Error(`You cannot update a fresh model instance , trying fetching one using find method`)
    }
    const values = this.attributes
    const isMutated = true
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
    if (!helpers.isFetched(this)) {
      throw new Error(`You cannot delete a fresh model instance , trying fetching one using find method`)
    }
    return new Promise((resolve, reject) => {
      this
        .constructor
        .forceDelete(this.connection)
        .then((response) => {
          this.attributes = {}
          this.connection = this.constructor.database.table(this.constructor.table)
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

    /**
     * meta data for a given relation , required to make dynamic queries
     * @type {Object}
     */
    const relationMetaData = {model, targetPrimaryKey, relationPrimaryKey, relation:'hasOne'}

    /**
     * relation scopes are nested queries on relationship models, they are
     * not required by model instance, but required when fetching 
     * relationships using with method.
     * @type {Object}
     */
    relationMetaData.relationsScope = this.constructor._relationsScope

    /**
     * here we attach nestedScope added by `scope` method, and to
     * be used by relational methods
     * @type {Object}
     */
    relationMetaData.nestedScope = this.constructor._nestedScope

    /**
     * otherwise set relation meta data on model defination,
     * later it will be used by fetch method to resolve
     * relations
     */
    this.constructor._activeRelation = relationMetaData

    /**
     * if calling this method on model instance , setup query builder for
     * relational model.
     */
    if(this.attributes){

      /**
       * this method also sets the foreign key and it's value to be utilized
       * by relational model.
       */
      model._foreignKey[relationPrimaryKey] = this.attributes[targetPrimaryKey]
      return staticHelpers.resolveHasOne(this.attributes,relationMetaData)
    }

    return model
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

    /**
     * meta data for a given relation , required to make dynamic queries
     * @type {Object}
     */
    const relationMetaData = {model, targetPrimaryKey, relationPrimaryKey, relation:'belongsTo'}

    /**
     * relation scopes are nested queries on relationship models, they are
     * not required by model instance, but required when fetching 
     * relationships using with method.
     * @type {Object}
     */
    relationMetaData.relationsScope = this.constructor._relationsScope

    /**
     * here we attach nestedScope added by `scope` method, and to
     * be used by relational methods
     * @type {Object}
     */
    relationMetaData.nestedScope = this.constructor._nestedScope

    /**
     * otherwise set relation meta data on model defination,
     * later it will be used by fetch method to resolve
     * relations
     */
    this.constructor._activeRelation = relationMetaData

    /**
     * if calling this method on model instance , return query builder for
     * relational model.
     */
    if(this.attributes){
      model._associationModel = this.constructor
      return staticHelpers.resolveBelongsTo(this.attributes,relationMetaData)
    }

    return model
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

    const relationMetaData = {model, targetPrimaryKey, relationPrimaryKey, relation:'hasMany'}

    /**
     * relation scopes are nested queries on relationship models, they are
     * not required by model instance, but required when fetching 
     * relationships using with method.
     * @type {Object}
     */
    relationMetaData.relationsScope = this.constructor._relationsScope

    /**
     * here we attach nestedScope added by `scope` method, and to
     * be used by relational methods
     * @type {Object}
     */
    relationMetaData.nestedScope = this.constructor._nestedScope

    /**
     * otherwise set relation meta data on model defination,
     * later it will be used by fetch method to resolve
     * relations
     */
    this.constructor._activeRelation = relationMetaData


    /**
     * if calling this method on model instance , setup query builder for
     * relational model.
     */
    if(this.attributes){

      /**
       * this method also sets the foreign key and it's value to be utilized
       * by relational model.
       */
      model._foreignKey[relationPrimaryKey] = this.attributes[targetPrimaryKey]
      return staticHelpers.resolveHasMany(this.attributes,relationMetaData)
    }

    return model
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

    /**
     * host model primary key
     * @type {String}
     */
    const targetPrimaryKey = this.constructor.primaryKey

    /**
     * foreign key on relational model [ NOT PIVOT TABLE ]
     * @type {String}
     */
    const relationPrimaryKey = model.primaryKey

    const relationMetaData = { model, pivotTable, pivotPrimaryKey, pivotOtherKey, targetPrimaryKey, relationPrimaryKey, relation:'belongsToMany'}

    /**
     * relation scopes are nested queries on relationship models, they are
     * not required by model instance, but required when fetching 
     * relationships using with method.
     * @type {Object}
     */
    relationMetaData.relationsScope = this.constructor._relationsScope

    /**
     * here we attach nestedScope added by `scope` method, and to
     * be used by relational methods
     * @type {Object}
     */
    relationMetaData.nestedScope = this.constructor._nestedScope

    /**
     * otherwise set relation meta data on model defination,
     * later it will be used by fetch method to resolve
     * relations
     */
    this.constructor._activeRelation = relationMetaData

    /**
     * if calling this method on model instance , return query builder for
     * relational model.
     */
    if(this.attributes){
      model._associationModel = this.constructor
      model._pivotAttributes = this.attributes
      return staticHelpers.resolveBelongsToMany(this.attributes,relationMetaData)
    }

    return model

  }

}

module.exports = Model
