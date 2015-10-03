'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const _ = require('lodash')
const Q = require('q')

let relation = exports = module.exports = {}

/**
 * @function fetchRelated
 * @description fetching relations related to target model.
 * @param  {Object}     values
 * @param  {Array}     models
 * @return {Object}
 * @public
 */
relation.fetchRelated = function (target, values, models) {

  /**
   * here we setup relation methods by fetching related models 
   * from Ioc container and make an array of promises to be
   * used with Q.all. Each relation method is responsible
   * for transforming the actual values object.
  */
  const relationPromises = _.map(models, function (model) {

    /**
     * here we take all the required steps to segregate nested models.
     * This is how it works.
     * @example
     * given nested relation users.posts
     * we first resolve users relation and call it's with
     * method by passing `posts`. Which will resolve 
     * posts automatically on users.
     * Above cycle goes on until we reach the last relation.
     * @type {Array}
     */
    model = model.split('.')
    const nestedModels = _.rest(model).join('.')
    model = model[0]

    /**
     * here we expect that value of model should exists
     * on model as a function which calls relationship
     * methods to define their relation.
     */
    target.prototype[model]()

    /**
     * once relationship method has been called
     * we fetch active relation meta data to 
     * be used for dynamic queries on related
     * model
     * @type {Object}
     */
    const resolvedModel = target._activeRelation

    /**
     * here we join the key to resolved model , it is required
     * so that relation methods can attach final results
     * to this key.
     * @example
     *   Phone model will bind phones for a given user
     *   to phones key
     *   user = {
     *     id: 1,
     *     username: 'foo',
     *     phones : {
     *       id: 1,
     *       user_id: 1
     *     }
     *   }
     */
    resolvedModel.key = model

    /**
     * nested models are relationships to be fetched
     * on target model or on target models's model
     * they can be infinite deep
     * @type {String}
     */
    resolvedModel.nestedModels = nestedModels

    /**
     * here we call relation method for a given relation and pass values to be
     * transformed with model binding from Ioc container.
     */
    return relation[resolvedModel.relation](values,resolvedModel)
  })

  /**
   * finally we invoke all promises using Q.all method and resolve the values
   * object which have been transformed over time.
   */
  return new Promise(function (resolve, reject) {
    Q.all(relationPromises)
    .then (function(){
      resolve(values)
    }).catch(reject)
  })

}

/**
 * @function hasOne
 * @description hasOne method is a relation method , who's job is 
 * to fetch related values from a given model and
 * attach them to original values object.
 * @param  {Object}  values
 * @param  {Object}  model
 * @return {Object}
 * @public
 */
relation.hasOne = function (values, model, limit) {

  /**
   * finding whether original values for the target model
   * is an array or not , for non-arrays we need to set
   * limit to one while fetching related results and
   * for arrays we cannot use limit as there are
   * multiple rows to be fetched.
   * @type {Boolean}
   */
  const isArray = values.isArray()

  /**
   * limit to be set on relation model but is completely
   * dependent upon isArray property
   * @type {[type]}
   */
  const internalLimit = isArray ? null : 1
  limit = limit || internalLimit

  /**
   * getting values to be used while making query on 
   * related model. It is important to prepend 
   * table name when making queries as knex
   * will not throw an error when not
   * using table name on field name
   * @type {[type]}
   */
  let builder = model.model
  const table = builder.table
  const targetPrimaryKey = model.targetPrimaryKey
  const relationPrimaryKey = model.relationPrimaryKey

  /**
   * this is key where we attach data for relational model. 
   * @example
   * class User extends Model{
   *   profile(){
   *     this.hasOne('App/Model/Profile')
   *   }
   * }
   * `profile` is the key here
   * @type {String}
   */
  const keyToBindOn = model.key

  /**
   * if relationsScope is defined on runtime, call scope
   * method and by passing relational model
   */

  if(model.relationsScope && model.relationsScope[keyToBindOn]) {
    model.relationsScope[keyToBindOn](builder)
  }

  /**
   * related model will have a whereIn clause based upon relationPrimaryKey
   * and targetPrimaryKey.
   * @type {Array}
   */
  let whereInValues = relation.getWhereInArray(values, isArray, targetPrimaryKey)

  builder = builder.whereIn(`${table}.${relationPrimaryKey}`,whereInValues)

  if(limit && limit !== 'noLimit'){
    builder = builder.first()
  }

  /**
   * if there are nested models to be fetched
   * set with clause with them
   */
  if(model.nestedModels){
    builder.with(model.nestedModels)
  }

  /**
   * if there is nestedScope set on the model object , 
   * set it on builder object. 
   * @note - We will keep on sending nested
   * object until it is picked up by any
   * model/or cleared by last model.
   */
  if(model.nestedScope){
    _.each(model.nestedScope, function (callback, key){
      builder.scope(key,callback)
    })
  }

  return new Promise (function (resolve, reject) {

    return builder    
    .fetch()
    .then (function (response) {

      /**
       * here we group values for relation model based on it's relationPrimaryKey
       * so that we can attach the entire group to the target model values 
       * instead of looping through them and doing manual checks.
       * @type {[type]}
      */
      let relationGroup = []

      if(response.isArray()){
        /**
         * if returned value is an array , we need to created group based on their
         * relationPrimaryKey and then attach groups to actual values based on
         * their targetPrimaryKey.
         */
        if(limit === 'noLimit'){

          /**
           * here we make sure relational model has returned some values after
           * query execution,it not we make relationGroup equals to an empty
           * array.We can also stop execution of this method here but that
           * will make results unstable as in situation of multiple results we
           * have to set key/values to each row inside an array.So it is
           * better to keep this empty here and let execution going on to keep
           * results stable.
           */
          relationGroup = response.size() ? response.groupBy(relationPrimaryKey).toJSON() : []
          /**
           * we set response to an empty array if response is empty, it is required so
           * that while attaching values on host model , we can set empty array of
           * relation where there are no values
           * @type {Array}
           */
          response = []
        }else{
          response = response.first()
          /**
           * again here we make sure response.first() returns something, if not we let relationGroup
           * to be an empty object as defined at first place
           */
          if(response){
            relationGroup[response[relationPrimaryKey]] = response
          }
        }
      }else{

        /**
         * otherwise we need to fetch just the value from flat object
         * and set key/value pair on array to be used by upcoming
         * code.
         */
        response = response.toJSON()
        relationGroup[response[relationPrimaryKey]] = response
      }

      /**
       * finally we transform values and set key/value pair on target model
       * values
       */
      relation.transformValues(values, relationGroup, isArray, targetPrimaryKey, keyToBindOn, _.isArray(response))
      
      resolve(values)
    })
    .catch(function (err) {
      reject(err)
    })

  })

}

/**
 * @function hasMany
 * @description hasMany method for model relation, it is similar to hasone
 * but instead return multiple values
 * @param  {Object}  values
 * @param  {Object}  model
 * @return {Object}
 * @public
 */
relation.hasMany = function (values, model) {
  return relation.hasOne(values, model, 'noLimit')
}

/**
 * @function belongsTo
 * @description belongsTo method for model relation , it is similar to hasOne
 * but with opposite keys
 * @param  {Object}  values
 * @param  {Object}  model
 * @return {Object}
 * @public
 */
relation.belongsTo = function (values, model) {
  return relation.hasOne(values, model)
}

/**
 * @function belongsToMany
 * @description returns transformed values for belongs to 
 * many relationship
 * @param  {Object|Array} values
 * @param  {Object}       model
 * @return {Object}
 * @public
 */
relation.belongsToMany = function (values, model) {

  const pivotPrefix = '_pivot_'

  /**
   * finding whether original values for the target model
   * is an array or not , for non-arrays we need to set
   * limit to one while fetching related results and
   * for arrays we cannot use limit as there are
   * multiple rows to be fetched.
   * @type {Boolean}
   */
  const isArray = values.isArray()


  /**
   * getting values to be used while making query on 
   * related model. It is important to prepend 
   * table name when making queries as knex
   * will not throw an error when not
   * using table name on field name
   * @type {[type]}
   */
  let builder = model.model
  const table = builder.table
  const pivotTable = model.pivotTable
  const pivotPrimaryKey = model.pivotPrimaryKey
  const pivotOtherKey = model.pivotOtherKey
  const relationPrimaryKey = model.relationPrimaryKey
  const targetPrimaryKey = model.targetPrimaryKey

  /**
   * if relationsScope is defined on runtime, call scope
   * method and by passing relational model
   */
  if(model.relationsScope && model.relationsScope[model.key]) {
    model.relationsScope[model.key](builder)
  }

  /**
   * related model will have a whereIn clause based upon relationPrimaryKey
   * and targetPrimaryKey.
   * @type {Array}
   */
  let whereInValues = relation.getWhereInArray(values, isArray, targetPrimaryKey)

  /**
   * selectionKeys are keys to be selected when making innerjoin
   * query
   * @type {Array}
   */
  let selectionKeys = [
    `${table}.*`,
    `${pivotTable}.${pivotPrimaryKey} as ${pivotPrefix}${pivotPrimaryKey}`,
    `${pivotTable}.${pivotOtherKey} as ${pivotPrefix}${pivotOtherKey}`
  ]

  /**
   * we set the pivot table here. This will be used by fetch 
   * method to fetch extra pivot columns defined by user.
   * @type {String}
   */
  builder._pivotTable = pivotTable

  /**
   * if there are nested models to be fetched
   * set with clause with them
   */
  if(model.nestedModels){
    builder.with(model.nestedModels)
  }

  /**
   * if there is nestedScope set on the model object , 
   * set it on builder object. 
   * @note - We will keep on sending nested
   * object until it is picked up by any
   * model/or cleared by last model.
   */
  if(model.nestedScope){
    _.each(model.nestedScope, function (callback, key){
      builder.scope(key,callback)
    })
  }

  return new Promise (function (resolve,reject) {

    builder
    .select.apply(builder,selectionKeys)
    .whereIn(`${pivotTable}.${pivotPrimaryKey}`,whereInValues)
    .innerJoin(pivotTable,function () {

      this.on(`${table}.${targetPrimaryKey}`,`${pivotTable}.${pivotOtherKey}`)

    })
    .fetch()
    .then (function (response) {

      /**
       * here we group values for relation model based on it's relationPrimaryKey
       * so that we can attach the entire group to the target model values 
       * instead of looping through them and doing manual checks.
       * @type {[type]}
      */
      let relationGroup = []

      if(response.isArray()){

        /**
         * here we make sure relational model has returned some values after
         * query execution,it not we make relationGroup equals to an empty
         * array.We can also stop execution of this method here but that
         * will make results unstable as in situation of multiple results we
         * have to set key/values to each row inside an array.So it is
         * better to keep this empty here and let execution going on to keep
         * results stable.
         */
        relationGroup = response.size() ? response.groupBy(`${pivotPrefix}${pivotPrimaryKey}`).toJSON() : []
      }else{

        /**
         * otherwise we need to fetch just the value from flat object
         * and set key/value pair on array to be used by upcoming
         * code.
         */
        response = response.toJSON()
        relationGroup[response[`${pivotPrefix}${pivotPrimaryKey}`]] = response
      }

      /**
       * finally we transform values and set key/value pair on target model
       * values
       */
      relation.transformValues(values, relationGroup, isArray, targetPrimaryKey, model.key, true)
      
      resolve(values)      

    })
    .catch(reject)

  })

}

/**
 * @function transformValues
 * @description transforming values of target model and attaching
 * relation model values to a given key
 * @param  {Object|Array}        values
 * @param  {Object|Array}        relationValues
 * @param  {Boolean}       isArray
 * @param  {String}        primaryKey
 * @param  {String}        objectKey
 * @param  {Boolean}       isRelationArray
 * @return {Object|Array}
 * @public
 */
relation.transformValues = function (values, relationValues, isArray, primaryKey, objectKey, isRelationArray) {

  if(!isArray) {

    /**
     * if target values are not array , then set and get values on 
     * flat object using collection get/set methods.
    */
    const primaryKeyValue = values.get(primaryKey)
    const relatedValues = relationValues[primaryKeyValue] || (isRelationArray ? [] : {})
    values.set(objectKey, relatedValues).value()

    return values

  }

  /**
   * otherwise loop through the collection values and set object keys
   * for each row
   */
  values.each (function (item) {
    item[objectKey] = relationValues[item[primaryKey]] || (isRelationArray ? [] : {})
  }).value()

  return values

}

/**
 * @function getWhereInArray
 * @description makes an array of values from an object for a given key
 * @param  {Object}        values
 * @param  {Boolean}       isArray
 * @param  {String}        targetPrimaryKey
 * @return {Array}
 * @public
 */
relation.getWhereInArray = function (values, isArray, targetPrimaryKey) {
  /**
   * if values are not an array , simply fetch targetPrimaryKey
   * value.
   */
  if(!isArray) {
    return [values.get(targetPrimaryKey)]
  }

  /**
   * otherwise map all values and make an array of primaryKey values
   */
  return values.map(function (value) {
    return value[targetPrimaryKey]
  }).value()
}

/**
 * @function transformSelectColumns
 * @description Transforming select columns on query builder
 * by attaching pivot columns defined by user on relation
 * methods.
 * @param  {Array}               statementGroups
 * @param  {Array}               pivotColumns
 * @param  {String}               pivotTable
 * @return {void}
 * @public
 */
relation.transformSelectColumns = function (statementGroups, pivotColumns, pivotTable) {

  const pivotPrefix = '_pivot_'

  /**
   * if user has asked for pivotColumns to be fetched , we 
   * update query builder columns array by concatenating
   * extra columns
   */
  if(pivotColumns.length){

    /**
     * first we fetch columns defined on existing query chain, query chain
     * has multiple groups and anyone group will belong to the columns.
     * For that we need to filter the one that belongs to columns
     */
    const selectedColumns = _.first(_.filter(statementGroups, function (group) {
      return group.grouping === 'columns'
    }))

    /**
     * next we transform extra keys to be fetched from query and prefix them with
     * pivotTable prefix
     */
    pivotColumns = _.transform(pivotColumns, function (result, column) {
      return result.push(`${pivotTable}.${column} as ${pivotPrefix}${column}`)
    })

    /**
     * updating query builder columns here
     * @type {Array}
     */
    selectedColumns.value = selectedColumns.value ? selectedColumns.value.concat(pivotColumns) : []

  }
}
