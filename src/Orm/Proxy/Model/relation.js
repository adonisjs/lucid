'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

let relation = exports = module.exports = {}


/**
 * @function associate
 * @description associate method is belongsTo relation specific
 * only. It sets association attributes to be used by model
 * under relation before creating or updating model.
 * @param  {Object}  target
 * @param  {Object}  model
 * @return {void}
 * @public
 */
relation.associate = function (target,model) {
  /**
   * making sure that associate is called on belongsTo relation only.
   */
  if(!target._associationModel._activeRelation){
    throw new Error('unable to call associate , make sure to call relationship method before associate')
  }
  if(target._associationModel._activeRelation.relation !== 'belongsTo'){
    throw new Error(`Unable to call associate on ${target._associationModel._activeRelation.relation}`)
  }
  target._associationModel._associationAttributes.push({attributes:model.attributes,targetPrimaryKey:target._associationModel._activeRelation.targetPrimaryKey,relationPrimaryKey:target._associationModel._activeRelation.relationPrimaryKey})
  target.new()
}

/**
 * @function dissociate
 * @description dissociate method is belongsTo relation specific
 * only. It sets association attributes to null which tells
 * model under relation to set foreign key value as back
 * to null
 * @param  {Object}  target
 * @param  {Object}  model
 * @return {void}
 * @public
 */
relation.dissociate = function (target){
  /**
   * making sure that dissociate is called on belongsTo relation only.
   */
  if(!target._associationModel._activeRelation){
    throw new Error('unable to call dissociate , make sure to call relationship method before dissociate')
  }
  if(target._associationModel._activeRelation.relation !== 'belongsTo'){
    throw new Error(`Unable to call dissociate on ${target._associationModel._activeRelation.relation}`)
  }
  target._associationModel._associationAttributes.push({attributes:{dissociate:true},targetPrimaryKey:target._associationModel._activeRelation.targetPrimaryKey,relationPrimaryKey:target._associationModel._activeRelation.relationPrimaryKey})
  target.new()
}

/**
 * @function attach
 * @description this method is only belongsToMany specific and will
 * attach primary values from 2 models into a pivot table.
 * @note this method does not touch host/relational model
 * tables. It only make neccessary entries inside
 * pivot table
 * @param  {Object} target        [description]
 * @param  {Number} relationValue [description]
 * @param  {Object} extraFields   [description]
 * @return {Object}               [description]
 */
relation.attach = function (target, relationValue, extraFields) {

  /**
   * getting relationship meta data to be used while persisting
   * values inside pivot table.
   */
  const getPersistanceFields = relation.getFieldsForAD(target)
  const pivotTable = getPersistanceFields.pivotTable
  const pivotPrimaryKey = getPersistanceFields.pivotPrimaryKey
  const pivotOtherKey = getPersistanceFields.pivotOtherKey
  const targetPrimaryKey = getPersistanceFields.targetPrimaryKey

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
   * raw query to insert relationship values inside pivot table
   */
  return target.database.table(pivotTable).insert(pivotValues)
}

/**
 * @function detach
 * @description this method is only belongsToMany specific and will
 * remove primary values of 2 models from pivot table.
 * @note this method does not touch host/relational model
 * tables. It only remove rows from pivot table.
 * @param  {Object} target        [description]
 * @param  {Number} relationValue [description]
 * @return {Object}               [description]
 */
relation.detach = function (target, relationValue) {

  /**
   * getting relationship meta data to be used while removing
   * values inside pivot table.
   */
  const getPersistanceFields = relation.getFieldsForAD(target)
  const pivotTable = getPersistanceFields.pivotTable
  const pivotPrimaryKey = getPersistanceFields.pivotPrimaryKey
  const pivotOtherKey = getPersistanceFields.pivotOtherKey
  const targetPrimaryKey = getPersistanceFields.targetPrimaryKey


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
   * after detach.
   */
  target._associationModel.new()

  target.new()

  /**
   * raw query to delete relationship inside pivot table
   */
  return target.database.table(pivotTable).where(whereClause).delete()
}

/**
 * @description think of it as a real helper method to get values
 * required to attach belongsToMany models values inside a
 * pivot table.
 * @method getPersistanceFields
 * @param  {Object}             target [description]
 * @return {Object}                    [description]
 * @throws {Error} If relation is not belongsToMany
 */
relation.getFieldsForAD = function (target){
  /**
   * making sure that attach is called on belongsToMany relation only.
   */
  if(!target._associationModel._activeRelation || !target._pivotAttributes){
    throw new Error('unable to call attach , make sure to call relationship method before dissociate')
  }

  if(target._associationModel._activeRelation.relation !== 'belongsToMany'){
    throw new Error(`unable to call attach on ${target._associationModel._activeRelation.relation}`)
  }

  /**
   * properly reading pivot relation keys from association model relation.
   */
  const pivotTable = target._associationModel._activeRelation.pivotTable
  const pivotPrimaryKey = target._associationModel._activeRelation.pivotPrimaryKey
  const pivotOtherKey = target._associationModel._activeRelation.pivotOtherKey
  const targetPrimaryKey = target._associationModel._activeRelation.targetPrimaryKey

  return {pivotTable, pivotPrimaryKey, pivotOtherKey, targetPrimaryKey}
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
 * @public
 */
relation.resolveHasOne = function (values, relationDefination, limit) {

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
 * @public
 */
relation.resolveBelongsTo = function (values, relationDefination) {
  return relation.resolveHasOne(values, relationDefination)
}

/**
 * @function resolveHasMany
 * @description setting up model with initial query params for hasMany
 * relation, under the hood it calls hasOne but without limit clause.
 * @param  {Object}         values
 * @param  {Object}         relationDefination
 * @return {Object}
 */
relation.resolveHasMany = function (values, relationDefination) {
  return relation.resolveHasOne(values,relationDefination, 'noLimit')
}

/**
 * @function resolveBelongsToMany
 * @description setting up model with initial query params for
 * belongsToMany. It returns query builder which can be
 * chained further.
 * @param  {Object}             values             [description]
 * @param  {Object}             relationDefination [description]
 * @return {Object}                                [description]
 * @public
 */
relation.resolveBelongsToMany = function (values, relationDefination) {

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
    this.on(`${table}.${relationPrimaryKey}`,`${pivotTable}.${pivotOtherKey}`)
  })

  return model

}
