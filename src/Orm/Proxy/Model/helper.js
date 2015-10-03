'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const changeCase = require('change-case')
const inflect = require('i')()
const _ = require('lodash')

/**
 * @module helper
 * @description helper for adonis model class
 */
let helper = exports = module.exports = {}

/**
 * @function mutateField
 * @description calls setter function on a given
 * field (if defined)
 * @param  {Object} target
 * @param  {String} field
 * @return {Function|Null}
 * @public
 */
helper.mutateField = function (target, field) {
  const setter = `set${changeCase.pascalCase(field)}`
  return target[setter] || null
}

/**
 * @function mutateRow
 * @description call setter function on values in
 * a given row
 * @param  {Object} target
 * @param  {Object} row
 * @return {Object}
 * @public
 */
helper.mutateRow = function (target, row) {
  return _.object(_.map(row, function (item, index) {
    const setter = helper.mutateField(target, index)
    const setterValue = setter ? setter(item) : item
    return [index, setterValue]
  }))
}

/**
 * @function mutateSetters
 * @description call setter function on an array
 * of item.
 * @param  {Object} target
 * @param  {Array} values
 * @return {Array}
 * @public
 */
helper.mutateSetters = function (target, values) {
  if (_.isArray(values)) {
    return _.map(values, function (value) {
      return helper.mutateRow(target, value)
    })
  }
  return helper.mutateRow(target, values)
}

/**
 * @function addTimeStamps
 * @description adds timestamps on a given a model
 * attributes before saving or updating
 * @param {Array|Object} rows
 * @param {Array} keys
 * @return {Array|Object}
 * @public
 */
helper.addTimeStamps = function (rows, keys) {
  if (_.isArray(rows)) {
    rows = _.map(rows, function (row) {
      return helper.rowTimeStamp(row, keys)
    })
  } else {
    rows = helper.rowTimeStamp(rows, keys)
  }
  return rows
}

/**
 * @function rowTimeStamp
 * @description add timestamps on a given row before
 * saving or updating it
 * @param  {Object} row
 * @param  {Array} keys
 * @return {Object}
 * @public
 */
helper.rowTimeStamp = function (row, keys) {
  const currentTimeStamp = new Date()
  keys.forEach(function (key) {
    row[key] = currentTimeStamp
  })
  return row
}

/**
 * @function isFetched
 * @description determines whether there are any where
 * statements available on query chain. Required
 * to make sure we are updating models whose
 * instance belongs to a user via find
 * @param  {Object}  target
 * @return {Boolean}
 * @public
 */
helper.isFetched = function (target) {
  return _.size(target.connection._statements) > 0
}


/**
 * @function getTableName
 * @description makes table name based upon available properties
 * for a given table
 * @param  {Class} target
 * @return {String}
 * @public
 */
helper.getTableName = function (target) {
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
 * @public
 */
helper.getPivotTableName = function (targetTable, relationTable) {
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
helper.getRelationKey = function (target, isConstructor) {

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
helper.getPrimaryKey = function (target) {
  return target.primaryKey || 'id'
}
