'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const changeCase = require('change-case')
const _ = require('lodash')

/**
 * @module helpers
 * @description helpers for adonis model class
 */
let helpers = exports = module.exports = {}

/**
 * @function mutateField
 * @description calls setter function on a given
 * field (if defined)
 * @param  {Object} target
 * @param  {String} field
 * @return {Function|Null}
 * @public
 */
helpers.mutateField = function (target, field) {
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
helpers.mutateRow = function (target, row) {
  return _.object(_.map(row, function (item, index) {
    const setter = helpers.mutateField(target, index)
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
helpers.mutateSetters = function (target, values) {
  if (_.isArray(values)) {
    return _.map(values, function (value) {
      return helpers.mutateRow(target, value)
    })
  }
  return helpers.mutateRow(target, values)
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
helpers.addTimeStamps = function (rows, keys) {
  if (_.isArray(rows)) {
    rows = _.map(rows, function (row) {
      return helpers.rowTimeStamp(row, keys)
    })
  } else {
    rows = helpers.rowTimeStamp(rows, keys)
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
helpers.rowTimeStamp = function (row, keys) {
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
helpers.isFetched = function (target) {
  return _.size(target.connection._statements) > 0
}
