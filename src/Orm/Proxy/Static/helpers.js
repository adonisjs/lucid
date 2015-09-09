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
 */
helpers.getTableName = function (target) {
  const modelName = target.name
  return changeCase.lowerCase(inflect.pluralize(modelName))
}

/**
 * @function getPrimaryKey
 * @description returns table primaryKey
 * @param  {Class} target
 * @return {String}
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
 */
helpers.pickFields = function (visible, row) {
  return _.pick(row, visible)
}
