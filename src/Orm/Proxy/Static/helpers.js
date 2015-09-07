'use strict'

const changeCase = require('change-case')
const inflect = require('i')()
const _ = require('lodash')
const Collection = require('../../Collection')

/**
 * @module helpers
 * @description Helpers for doing DRY operations while
 * setting up models
 */
let helpers = exports = module.exports = {}

/**
 * @function makeScoped
 * @description covert function defination to scope
 * defination
 * @param  {Class} target
 * @param  {String} name
 * @return {*}
 */
helpers.makeScoped = function(target,name){
  name = `scope${changeCase.pascalCase(name)}`
  return target[name] || null
}

/**
 * @function getTableName
 * @description makes table name based upon available properties
 * for a given table
 * @param  {Class} target
 * @return {String}
 */
helpers.getTableName = function(target){
  const modelName = target.name
  return changeCase.lowerCase(inflect.pluralize(modelName))
}

/**
 * @function getPrimaryKey
 * @description returns table primaryKey
 * @param  {Class} target
 * @return {String}
 */
helpers.getPrimaryKey = function(target){
  return target.primaryKey || 'id'
}

helpers.hasGetter = function(target,fieldName){
  const getter = `get${changeCase.pascalCase(fieldName)}`
  return target.prototype[getter] || null
}

helpers.mutateRow = function (target,row) {
  return _.object(_.map(row, function (item,key) {
    const getter = helpers.hasGetter(target,key)
    const mutatedValue = getter ? getter(item) : item
    return [key,mutatedValue]
  }))
}

helpers.mutateValues = function(target,values){
  let collection;
  if(_.isArray(values)){
    collection = _.map(values, function (value){
      return helpers.mutateRow(target,value)
    })
  }else{
    collection = helpers.mutateRow(target,values)
  }
  return new Collection(collection)
}

helpers.setVisibility = function (target,values){
  if(target.hidden && !target.visible){
    values = _.map(values,function (value) {
      return helpers.omitFields(target.hidden,value)
    })
  }else if(target.visible){
    values = _.map(values,function (value) {
      return helpers.pickFields(target.visible,value)
    })
  }
  return values
}

helpers.omitFields = function (hidden,row) {
  return _.omit(row,hidden)
}

helpers.pickFields = function (visible,row) {
  return _.pick(row,visible)
}
