'use strict'

const modelHelpers = require('../Model/helpers')

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
 */
addons.create = function (target, values, isMutated, connection) {

  /**
   * here we use given connection or falls back to
   * default connection on model static interface
   */
  connection = connection || target.activeConnection

  if (!isMutated) {
    values = modelHelpers.mutateSetters(target.prototype, values)
  }

  if (target.timestamps) {
    values = modelHelpers.addTimeStamps(values, ['created_at', 'updated_at'])
  }

  return connection.insert(values)
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
 */
addons.update = function (target, values, isMutated, connection) {
  connection = connection || target.activeConnection

  if (!isMutated) {
    values = modelHelpers.mutateSetters(target.prototype, values)
  }
  if (target.timestamps) {
    values = modelHelpers.addTimeStamps(values, ['updated_at'])
  }
  return connection.update(values)
}

/**
 * @function delete
 * @description deleting or soft deleting rows based on
 * model settings.
 * @param  {Object} target
 * @param  {Object} connection
 * @return {Promise}
 */
addons.delete = function (target, connection) {
  connection = connection || target.activeConnection

  if (target.softDeletes) {
    return connection.update(target.softDeletes, new Date())
  } else {
    return connection.del()
  }
}

/**
 * @function forceDelete
 * @description force deleting rows even if soft deletes
 * are enabled
 * @param  {Object} target
 * @param  {Object} connection
 * @return {Promise}
 */
addons.forceDelete = function (target, connection) {
  connection = connection || target.activeConnection
  return connection.del()
}
