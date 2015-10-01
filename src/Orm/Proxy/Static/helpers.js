'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const changeCase = require('change-case')
const inflect = require('i')()
const _ = require('lodash')
const Q = require('q')
const Collection = require('../../Collection')

/**
 * @module helpers
 * @description Helpers for doing DRY operations while
 * setting up models
 */
let helpers = exports = module.exports = {}

/**
 * @function makeScoped
 * @description convert function defination to scope
 * defination
 * @param  {Class} target
 * @param  {String} name
 * @return {*}
 * @public
 */
helpers.makeScoped = function (target, name) {
  name = `scope${changeCase.pascalCase(name)}`
  return target.prototype[name] || null
}

/**
 * @function getTableName
 * @description makes table name based upon available properties
 * for a given table
 * @param  {Class} target
 * @return {String}
 * @public
 */
helpers.getTableName = function (target) {
  const modelName = target.name
  return changeCase.lowerCase(inflect.pluralize(modelName))
}

/**
 * @function getPivotTableName
 * @description returns pivot table name for belongsToMany and
 * other pivot relations.
 * @param  {String}         targetTable
 * @param  {String}         relationTable
 * @return {String}
 */
helpers.getPivotTableName = function (targetTable, relationTable) {
  const tables = _.sortBy([targetTable,relationTable], function (name) { return name });
  return `${inflect.singularize(tables[0])}_${inflect.singularize(tables[1])}`
}


/**
 * @function getRelationKey
 * @description makes relation key for a model based on it's 
 * table name
 * @param  {Class} target
 * @param  {Boolean} isConstructor
 * @return {String}
 * @public
 */
helpers.getRelationKey = function (target, isConstructor) {

  const table = isConstructor ? target.table : target.constructor.table
  const primaryKey = isConstructor ? target.primaryKey : target.constructor.primaryKey

  return `${inflect.singularize(table)}_${primaryKey}`
}

/**
 * @function getPrimaryKey
 * @description returns table primaryKey
 * @param  {Class} target
 * @return {String}
 * @public
 */
helpers.getPrimaryKey = function (target) {
  return target.primaryKey || 'id'
}

/**
 * @function hasGetter
 * @description returns getter function on a given model
 * if exists , or returns null
 * @param  {Object}  target
 * @param  {String}  fieldName
 * @return {Boolean}
 * @public
 */
helpers.hasGetter = function (target, fieldName) {
  const getter = `get${changeCase.pascalCase(fieldName)}`
  return target.prototype[getter] || null
}

/**
 * @function mutateRow
 * @description here we call getters on all fields
 * inside an object.
 * @param  {Object} target
 * @param  {Object} row
 * @return {Object}
 * @public
 */
helpers.mutateRow = function (target, row) {
  return _.object(_.map(row, function (item, key) {
    const getter = helpers.hasGetter(target, key)
    const mutatedValue = getter ? getter(item) : item
    return [key, mutatedValue]
  }))
}

/**
 * @function mutateValues
 * @description here we call getters on rows inside an array
 * @param  {Object} target
 * @param  {Array|Object} values
 * @return {Array|Object}
 * @public
 */
helpers.mutateValues = function (target, values) {
  let collection
  if (_.isArray(values)) {
    collection = _.map(values, function (value) {
      return helpers.mutateRow(target, value)
    })
  } else {
    collection = helpers.mutateRow(target, values)
  }
  return new Collection(collection)
}

/**
 * @function setVisibility
 * @description here we loop through on fetched values
 * and omit or pick fields based on visibility and
 * hidden functions defined on model
 * @param {Object} target
 * @param {Object} values
 * @public
 */
helpers.setVisibility = function (target, values) {
  if (target.hidden && !target.visible) {
    values = _.map(values, function (value) {
      return helpers.omitFields(target.hidden, value)
    })
  }else if (target.visible) {
    values = _.map(values, function (value) {
      return helpers.pickFields(target.visible, value)
    })
  }
  return values
}

/**
 * @function omitFields
 * @description here we omit fields on a given row
 * @param  {Array} hidden
 * @param  {Object} row
 * @return {Object}
 * @public
 */
helpers.omitFields = function (hidden, row) {
  return _.omit(row, hidden)
}

/**
 * @function pickFields
 * @description here we fields fields on a given row
 * @param  {Array} visible
 * @param  {Object} row
 * @return {Object}
 * @public
 */
helpers.pickFields = function (visible, row) {
  return _.pick(row, visible)
}


/**
 * @function fetchRelated
 * @description fetching relations related to target model.
 * @param  {Object}     values
 * @param  {Array}     models
 * @return {Object}
 */
helpers.fetchRelated = function (target, values, models) {

  /**
   * here we setup relation methods by fetching related models 
   * from Ioc container and make an array of promises to be
   * used with Q.all. Each realtion method is responsible
   * for transforming the actual values object.
  */
  const relationPromises = _.map(models, function (model) {

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

    resolvedModel.nestedModels = nestedModels

    /**
     * here we call relation method for a given relation and pass values to be
     * transformed with model binding from Ioc container.
     */
    return helpers[resolvedModel.relation](values,resolvedModel)
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
 * hasOne method is a relation method , who's job is 
 * to fetch related values from a given model and
 * attach them to original values object.
 * @method hasOne
 * @param  {Object}  values
 * @param  {Object}  model
 * @return {Object}
 */
helpers.hasOne = function (values, model, limit) {

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
  let whereInValues = helpers.getWhereInArray(values, isArray, targetPrimaryKey)

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
      helpers.transformValues(values, relationGroup, isArray, targetPrimaryKey, keyToBindOn, _.isArray(response))
      
      resolve(values)
    })
    .catch(function (err) {
      reject(err)
    })

  })

}

/**
 * hasMany method for model relation, it is similar to hasone
 * but instead return multiple values
 * @method hasMany
 * @param  {Object}  values
 * @param  {Object}  model
 * @return {Object}
 */
helpers.hasMany = function (values, model) {
  return helpers.hasOne(values, model, 'noLimit')
}

/**
 * belongsTo method for model relation , it is similar to hasOne
 * but with opposite keys
 * @method belongsTo
 * @param  {Object}  values
 * @param  {Object}  model
 * @return {Object}
 */
helpers.belongsTo = function (values, model) {
  return helpers.hasOne(values, model)
}

/**
 * @function belongsToMany
 * @description returns transformed values for belongs to 
 * many relationship
 * @param  {Object|Array}      values
 * @param  {Object}      model
 * @return {Object}
 */
helpers.belongsToMany = function (values, model) {

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
  let whereInValues = helpers.getWhereInArray(values, isArray, targetPrimaryKey)

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
      helpers.transformValues(values, relationGroup, isArray, targetPrimaryKey, model.key, true)
      
      resolve(values)      

    })
    .catch(reject)

  })

}

/**
 * @description transforming values of target model and attaching
 * relation model values to a given key
 * @method transformValues
 * @param  {Object|Array}        values
 * @param  {Object|Array}        relationValues
 * @param  {Boolean}       isArray
 * @param  {String}        primaryKey
 * @param  {String}        objectKey
 * @param  {Boolean}       isRelationArray
 * @return {Object|Array}
 */
helpers.transformValues = function (values, relationValues, isArray, primaryKey, objectKey, isRelationArray) {

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
 */
helpers.getWhereInArray = function (values, isArray, targetPrimaryKey) {
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
 * @function resolveHasOne
 * @description This method is used by model instances to fetch related models
 * directly from model instance instead of calling `with` method. To keep
 * this simple and follow SRP, we define one method for each relation
 * type.
 * @param  {Object}      values
 * @param  {Object}      relationDefination
 * @return {Object}
 */
helpers.resolveHasOne = function (values, relationDefination, limit) {

  /**
   * getting relation model
   * @type {Class}
   */
  const model = relationDefination.model

  /**
   * if limit is not defined , set it to 1
   * @type {[type]}
   */
  limit = limit || 1

  /**
   * target key on host model
   * @type {Integer}
   */
  const targetPrimaryKey = relationDefination.targetPrimaryKey

  /**
   * foriegn key to be referenced on relational model
   * @type {Integer}
   */
  const relationPrimaryKey = relationDefination.relationPrimaryKey

  /**
   * returning model instance with required where clause
   */
  model.where(relationPrimaryKey,values[targetPrimaryKey])

  /**
   * if there is a limit defined , set limit clause. It
   * is true byDefault for hasOne and belongsTo
   */
  if(limit && limit !== 'noLimit'){
    model.limit(limit)
  }

  /**
   * returning model
   */
  return model

}

/**
 * @function resolveBelongsTo
 * @description setting up model with initial query params for belongsTo
 * relation, under the hood it calls hasOne but with opposite keys.
 * @param  {Object}         values
 * @param  {Object}         relationDefination
 * @return {Object}
 */
helpers.resolveBelongsTo = function (values, relationDefination) {
  return helpers.resolveHasOne(values, relationDefination)
}

/**
 * @function resolveHasMany
 * @description setting up model with initial query params for hasMany
 * relation, under the hood it calls hasOne but without limit clause.
 * @param  {Object}         values
 * @param  {Object}         relationDefination
 * @return {Object}
 */
helpers.resolveHasMany = function (values, relationDefination) {
  return helpers.resolveHasOne(values,relationDefination, 'noLimit')
}


helpers.resolveBelongsToMany = function (values, relationDefination) {

  /**
   * prefix to be prepended before values of pivot table
   * @type {String}
   */
  const pivotPrefix = '_pivot_'

  /**
   * getting relation model
   * @type {Class}
   */
  const model = relationDefination.model

  /**
   * table name of relational model
   */
  const table = model.table

  /**
   * target key on host model
   * @type {Integer}
   */
  const targetPrimaryKey = relationDefination.targetPrimaryKey

  /**
   * getting name for pivot table
   * @type {String}
   */
  const pivotTable = relationDefination.pivotTable


  /**
   * foriegn key to be referenced on relational model
   * @type {Integer}
   */
  const relationPrimaryKey = relationDefination.relationPrimaryKey

  /**
   * getting primary key for pivot table
   * @type {Integer}
   */
  const pivotPrimaryKey = relationDefination.pivotPrimaryKey

  /**
   * getting other/foreigh key for pivot table
   * @type {Integer}
   */
  const pivotOtherKey = relationDefination.pivotOtherKey

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
  model._pivotTable = pivotTable

  model
  .select.apply(model,selectionKeys)
  .where(`${pivotTable}.${pivotPrimaryKey}`,values[targetPrimaryKey])
  .innerJoin(pivotTable,function () {
    this.on(`${table}.${targetPrimaryKey}`,`${pivotTable}.${pivotOtherKey}`)
  })

  return model

}

/**
 * @description Transforming select columns on query builder
 * by attaching pivot columns defined by user on relation
 * methods.
 * @method transformSelectColumns
 * @param  {Array}               statementGroups
 * @param  {Array}               pivotColumns
 * @param  {String}               pivotTable
 * @return {void}
 */
helpers.transformSelectColumns = function (statementGroups, pivotColumns, pivotTable) {

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