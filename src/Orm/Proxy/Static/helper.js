'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const changeCase = require('change-case')
const _ = require('lodash')
const Collection = require('../../Collection')

/**
 * @module helper
 * @description helper for doing DRY operations while
 * setting up models
 */
let helper = exports = module.exports = {}

/**
 * @function makeScoped
 * @description convert function defination to scope
 * defination
 * @param  {Class} target
 * @param  {String} name
 * @return {*}
 * @public
 */
helper.makeScoped = function (target, name) {
  name = `scope${changeCase.pascalCase(name)}`
  return target.prototype[name] || null
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
helper.hasGetter = function (target, fieldName) {
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
helper.mutateRow = function (target, row) {
  return _.object(_.map(row, function (item, key) {
    const getter = helper.hasGetter(target, key)
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
helper.mutateValues = function (target, values) {
  let collection
  if (_.isArray(values)) {
    collection = _.map(values, function (value) {
      return helper.mutateRow(target, value)
    })
  } else {
    collection = helper.mutateRow(target, values)
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
helper.setVisibility = function (target, values) {
  if (target.hidden && !target.visible) {
    values = _.map(values, function (value) {
      return helper.omitFields(target.hidden, value)
    })
  }else if (target.visible) {
    values = _.map(values, function (value) {
      return helper.pickFields(target.visible, value)
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
helper.omitFields = function (hidden, row) {
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
helper.pickFields = function (visible, row) {
  return _.pick(row, visible)
}
