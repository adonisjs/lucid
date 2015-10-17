'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

/**
 * harmony-reflect is required to make proxy
 * api stable as of latest spec by ES6
 */
require('harmony-reflect')

const proxy         = require('./proxy')
const helper        = require('./helper')
const StaticProxy   = require('../Static')
const Ioc           = require('adonis-fold').Ioc
const relation      = require('./relation')
const _             = require('lodash')
const Collection    = require('../../Collection')

/**
 * @module Model
 * @description Base model to be extended while
 * creating models
 */
class Model {

  constructor (attributes) {
    /**
     * initiating model with array of data is not allowed, as single
     * model instance should only belongs to a single user.
     */
    if (_.isArray(attributes)) {
      throw new Error('Cannot initiate model with bulk values, use static create method for bulk insert')
    }

    /**
     * we set constructor arguments as attributes on model instance.
     * we also mutate them before setting attributes
     */
    this.attributes = attributes ? helper.mutateRow(this, attributes) : {}

    /**
     * here we create an isolated connection to
     * the database, one per model instance.
     */
    this.connection = this.constructor.database.table(this.constructor.table)

    /**
     * finally we return an instance of proxy. It helps in
     * resolving class methods/properties on runtime.
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
    const self = this

    /**
     * here we consume the create method from model
     * constructor and set primaryKey value to
     * value returned by create method.
     */
    return new Promise(function (resolve,reject) {
      /**
       * throw an error if trying to save multiple
       * rows via model instance.
       */
      if(values && _.isArray(values)){
        return reject(new Error('cannot persist model with multiple rows'))
      }

      let isMutated = !values
      values = values || self.attributes

      self.constructor
        .create(values, isMutated, self.connection)
        .then( function(response) {
          if(response[0]){
            self.attributes = helper.mutateRow(self,values)
            self.attributes[self.constructor.primaryKey] = response[0]
          }
          resolve(response)
        }).catch(reject)
    })

  }

  /**
   * @function update
   * @description updating existing model with current attributes
   * @return {Promise}
   * @public
   */
  update () {
    /**
     * one can only update existing model. Here we make
     * sure this model is initiated after db fetch.
     */
    if (!helper.isFetched(this)) {
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
    /**
     * one can only delete existing model. Here we make
     * sure this model is initiated after db fetch.
     */
    if (!helper.isFetched(this)) {
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
    const self = this

    /**
     * one can only delete existing model. Here we make
     * sure this model is initiated after db fetch.
     */
    if (!helper.isFetched(this)) {
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
    return helper.getTableName(this)
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
   * @function hasOne
   * @description defination for hasOne relation
   * @param  {String}  binding
   * @param  {String}  primaryId
   * @param  {String}  relationPrimaryId
   * @return {Object}
   * @public
   */
  hasOne(binding, targetPrimaryKey, relationPrimaryKey){

    /**
     * grab model from Ioc container
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
    relationPrimaryKey = relationPrimaryKey || helper.getRelationKey(this)

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
     * be used by relational methods.
     * @type {Object}
     */
    relationMetaData.nestedScope = this.constructor._nestedScope

    /**
     * here we attach relation meta data on model
     * constructor to be used by fetch method.
     */
    this.constructor._activeRelation = relationMetaData

    /**
     * if calling this method on model instance , setup query builder for
     * relational model.
     */
    if(this.attributes){

      /**
       * this method also sets the foreign key and it's value to be utilized by
       * relational model while creating a new record using create method.
       */
      model._foreignKey[relationPrimaryKey] = this.attributes[targetPrimaryKey]
      return relation.resolveHasOne(this.attributes,relationMetaData)
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
   * @public
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
    targetPrimaryKey = targetPrimaryKey || helper.getRelationKey(model,true)

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
     * here we attach relation meta data on model
     * constructor to be used by fetch method.
     */
    this.constructor._activeRelation = relationMetaData

    /**
     * if calling this method on model instance , return query builder for
     * relational model.
     */
    if(this.attributes){
      model._associationModel = this.constructor
      return relation.resolveBelongsTo(this.attributes,relationMetaData)
    }

    return model
  }


  /**
   * @function hasMany
   * @description creates defination for hasMany relation
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
    relationPrimaryKey = relationPrimaryKey || helper.getRelationKey(this)

    /**
     * meta data for a given relation , required to make dynamic queries
     * @type {Object}
     */
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
     * here we attach relation meta data on model
     * constructor to be used by fetch method.
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
      return relation.resolveHasMany(this.attributes,relationMetaData)
    }

    return model
  }

  /**
   * @function belongsToMany
   * @description creates relation defination for belongsToMany
   * @method belongsToMany
   * @param  {String}      binding         [description]
   * @param  {String}      pivotTable      [description]
   * @param  {String}      pivotPrimaryKey [description]
   * @param  {String}      pivotOtherKey   [description]
   * @return {Object}                      [description]
   */
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
    pivotTable = pivotTable || helper.getPivotTableName(this.constructor.table,model.table)

    /**
     * setting up primary key for target model
     * @type {String}
     */
    pivotPrimaryKey = pivotPrimaryKey || helper.getRelationKey(this)

    /**
     * setting up primary key for relation model
     * @type {String}
     */
    pivotOtherKey = pivotOtherKey || helper.getRelationKey(model, true)

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

      /**
       * below is required to make attach/detach function work, as here we
       * setup all required data to be used for attaching pivot table
       * data
       */
      model._associationModel = this.constructor
      model._pivotAttributes = this.attributes

      return relation.resolveBelongsToMany(this.attributes,relationMetaData)
    }
    return model
  }
}

module.exports = Model
