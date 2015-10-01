'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const modelHelpers = require('../Model/helpers')
const helpers = require('./helpers')

/**
 * @module addons
 * @description addons are extra method to model static interface
 */
let addons = exports = module.exports = {}

/**
 * @function create
 * @description here we insert values inside database and mutate
 * them before saving , if not already mutated
 * @param  {Object}  target
 * @param  {Array|Object}  values
 * @param  {Boolean} isMutated
 * @param  {Object}  connection
 * @return {Promise}
 * @public
 */
addons.create = function (target, values, isMutated, connection) {
  connection = connection || target.activeConnection

  /**
   * here we use given connection or falls back to
   * default connection on model static interface
   */

  if (!isMutated) {
    values = modelHelpers.mutateSetters(target.prototype, values)
  }

  if (target.timestamps) {
    values = modelHelpers.addTimeStamps(values, ['created_at', 'updated_at'])
  }

  /**
   * saving reference to insert query inside a variable
   * because we need to clear the query builder before
   * returning, so that is not chaining into old
   * queries
   * @type {Object}
   */
  const insertQuery = connection.insert(values)
  target.new()
  return insertQuery
}

/**
 * @function update
 * @description updating values using db update
 * method
 * @param  {Object}  target
 * @param  {Array|Object}  values
 * @param  {Boolean} isMutated
 * @param  {Object}  connection
 * @return {Promise}
 * @public
 */
addons.update = function (target, values, isMutated, connection) {
  connection = connection || target.activeConnection

  if (!isMutated) {
    values = modelHelpers.mutateSetters(target.prototype, values)
  }
  if (target.timestamps) {
    values = modelHelpers.addTimeStamps(values, ['updated_at'])
  }
  const updateQuery = connection.update(values)
  target.new()
  return updateQuery
}

/**
 * @function delete
 * @description deleting or soft deleting rows based on
 * model settings.
 * @param  {Object} target
 * @param  {Object} connection
 * @return {Promise}
 * @public
 */
addons.delete = function (target, connection) {
  connection = connection || target.activeConnection
  let deleteQuery = {}

  if (target.softDeletes) {
    deleteQuery = connection.update(target.softDeletes, new Date())
  } else {
    deleteQuery = connection.del()
  }
  target.new()
  return deleteQuery
}

/**
 * @function forceDelete
 * @description force deleting rows even if soft deletes
 * are enabled
 * @param  {Object} target
 * @param  {Object} connection
 * @return {Promise}
 * @public
 */
addons.forceDelete = function (target, connection) {
  connection = connection || target.activeConnection

  const deleteQuery = connection.del()
  target.new()
  return deleteQuery
}
