'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const helpers = require('./helpers')
const hijacker = require('./hijacker')
const _ = require('lodash')

/**
 * @module mapper
 * @description Proxy methods for class defination
 */
let mapper = exports = module.exports = {}

/**
 * @function get
 * @description This method proxy all get requests
 * of a given class. Here we add custom logic
 * to find best match for a given property
 * @param  {Class} target
 * @param  {String} name
 * @return {*}
 * @public
 */
mapper.get = function (target, name) {
  /**
   * if property exists on class , return that
   * first
   */
  if (target[name]) {
    return target[name]
  }

  /**
   * if prototype exists as a instance property on class
   * then call it
   */
  if (target.prototype[name]) {
    return target.prototype[name]
  }

  /**
   * if method name is withTrashed , return a new
   * function by setting soft deletes to false
   * till query instance.
   */
  if (name === 'withTrashed') {
    return function () {
      target.disableSoftDeletes = true
      return this
    }
  }

  /**
   * if name is find , then return a new function by
   * fetching data and set value as model instance
   */
  if (name === 'find') {
    return function (id) {
      return hijacker.find(target, id)
    }
  }

  /**
   * if name is all , then return a new function by
   * fetching all values from a given table
   */
  if (name === 'all') {
    return function () {
      return hijacker.all(target)
    }
  }

  /**
   * implement fetch method here to return values as
   * instance of collection class
   */
  if (name === 'fetch') {
    return function () {
      return hijacker.fetch(target, name)
    }
  }

  /**
   * implement `with` method here to fetch related models
   * with target model result
   */
  if (name === 'with') {
    return function () {
      target._relations = _.values(arguments)
      return this
    }
  }

  /**
   * if scope method is called , set relation
   * scope to be used by fetch method
   */
  if (name === 'scope'){
    return function (key, callback) {

      /**
       * splitting scope key with comma
       * @type {Array}
       */
      key = key.split('.')

      if(key.length > 1){

        /**
         * if key array has length of more than 1, then it
         * seems to be a nested relation and should be
         * set as a nested relation. Which internally
         * is passed on relation models until resolved
         * or ignored
         */
        const nestedScope = _.rest(key).join('.')
        target._nestedScope[nestedScope] = callback

      }else{

        /**
         * otherwise it is not a nested relation , and belongs to
         * the existing model
         */
        key = key[0]
        target._relationsScope[key] = callback

      }
      return this
    }
  }

  /**
   * setting up pivot columns to be fetched while making
   * many to many relation. Make sure this value will
   * be set on relational model, not on host model.
   */
  if(name === 'withPivot'){
    return function () {
      target._withPivot = _.values(arguments)
      return this
    }
  }

  /**
   * associating foreign key via belongsTo
   * relationship
   */
  if(name === 'associate'){

    /**
     * @param  {Object} model Model to associate
     * @return {void}
     */
    return function (model) {

      /**
       * making sure that associate is called on belongsTo relation only.
       */
      if(!target._associationModel._activeRelation){
        throw new Error('unable to call associate , make sure to call relationship method before associate')
      }
      if(target._associationModel._activeRelation.relation !== 'belongsTo'){
        throw new Error(`Unable to call associate on ${target._associationModel._activeRelation.relation}`)
      }
      target._associationModel._associationAttributes = model.attributes
      target.new()
    }
  }


  /**
   * dissociating foreign key via belongsTo
   * relationship
   */
  if(name === 'dissociate'){
    return function () {

      /**
       * making sure that dissociate is called on belongsTo relation only.
       */
      if(!target._associationModel._activeRelation){
        throw new Error('unable to call dissociate , make sure to call relationship method before dissociate')
      }
      if(target._associationModel._activeRelation.relation !== 'belongsTo'){
        throw new Error(`Unable to call dissociate on ${target._associationModel._activeRelation.relation}`)
      }
      target._associationModel._associationAttributes = {dissociate:true}
      target.new()
    }
  }

  /**
   * attaching belongsToMany relationships on pivot tables. 
   * this method read relation defination and make a
   * raw query using `database` property from model
   * constructor
   */
  if(name === 'attach'){

    return function (relationValue, extraFields){

      return new Promise(function (resolve, reject) {
        /**
         * making sure that attach is called on belongsToMany relation only.
         */
        if(!target._associationModel._activeRelation || !target._pivotAttributes){
          return reject('unable to call attach , make sure to call relationship method before dissociate')
        }
        if(target._associationModel._activeRelation.relation !== 'belongsToMany'){
          return reject(`Unable to call attach on ${target._associationModel._activeRelation.relation}`)
        }

        /**
         * properly reading pivot relation keys from association model relation.
         */
        const pivotTable = target._associationModel._activeRelation.pivotTable
        const pivotPrimaryKey = target._associationModel._activeRelation.pivotPrimaryKey
        const pivotOtherKey = target._associationModel._activeRelation.pivotOtherKey
        const targetPrimaryKey = target._associationModel._activeRelation.targetPrimaryKey

        /**
         * values object to be inserted inside pivot table
         * @type {Object}
         */
        const pivotValues = extraFields || {}
        pivotValues[pivotPrimaryKey] = target._pivotAttributes[targetPrimaryKey]
        pivotValues[pivotOtherKey] = relationValue

        /**
         * here we need to clean the association model also , as
         * no other method will be called on association model
         * after attach.
         */
        target._associationModel.new()

        target.new()

        /**
         * raw query to insert relationship inside pivot table
         */
        target.database.table(pivotTable).insert(pivotValues).then(resolve).catch(reject)
      })

    }
  }


  if(name === 'detach'){

    return function (relationValue){

      return new Promise(function (resolve, reject) {
        /**
         * making sure that attach is called on belongsToMany relation only.
         */
        if(!target._associationModel._activeRelation || !target._pivotAttributes){
          return reject('unable to call attach , make sure to call relationship method before dissociate')
        }
        if(target._associationModel._activeRelation.relation !== 'belongsToMany'){
          return reject(`Unable to call attach on ${target._associationModel._activeRelation.relation}`)
        }

        /**
         * properly reading pivot relation keys from association model relation.
         */
        const pivotTable = target._associationModel._activeRelation.pivotTable
        const pivotPrimaryKey = target._associationModel._activeRelation.pivotPrimaryKey
        const pivotOtherKey = target._associationModel._activeRelation.pivotOtherKey
        const targetPrimaryKey = target._associationModel._activeRelation.targetPrimaryKey

        /**
         * values object to be inserted inside pivot table
         * @type {Object}
         */
        const whereClause = {}
        whereClause[pivotPrimaryKey] = target._pivotAttributes[targetPrimaryKey]
        if(relationValue){
          whereClause[pivotOtherKey] = relationValue
        }

        /**
         * here we need to clean the association model also , as
         * no other method will be called on association model
         * after attach.
         */
        target._associationModel.new()

        target.new()

        /**
         * raw query to insert relationship inside pivot table
         */
        target.database.table(pivotTable).where(whereClause).delete().then(resolve).catch(reject)
      })

    }
  }

  /**
   * check to see if method is one of the scoped
   * methods or not, if method falls into a
   * scope method call that and pass current
   * query
   */
  const scopeFunction = helpers.makeScoped(target, name)
  if (scopeFunction) {
    return function () {
      const args = [this.activeConnection].concat(_.values(arguments))
      scopeFunction.apply(target,args)
      return this
    }
  }

  /**
   * finally if above checks fails , think of the
   * method as a query builder method.
   */
  return target.activeConnection[name]

}

/**
 * @function set
 * @description setter for proxy
 * @param {Object} target
 * @param {String} name
 * @param {*} value
 * @publc
 */
mapper.set = function (target, name, value) {
  target[name] = value
}

/**
 * @function construct
 * @description returns new instance of class
 * when someone asks for a new instance.
 * @param  {Class} target
 * @return {Object}
 * @publc
 */
mapper.construct = function (target, options) {
  var _bind = Function.prototype.bind
  return new (_bind.apply(target, [null].concat(options)))()
}
