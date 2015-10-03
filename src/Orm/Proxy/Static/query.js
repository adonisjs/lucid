'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const helper = require('./helper')
const relation = require('./relation')
const modelHelper = require('../Model/helper')

let query = exports = module.exports = {}

/**
 *
 * @function then
 * @description here we hijack then method on db query builder, it is required
 * to return collection , set visibility and mutate fields
 * @param  {Object}   target
 * @param  {String}   name
 * @param  {Function} cb
 * @public
 */
query.fetch = function (target) {

  /**
   * checking if soft deletes are enabled and user has not called withTrashed
   * , if above true conditions we will not fetch deleted values
   */
  if (target.softDeletes && !target.disableSoftDeletes) {
    target.activeConnection.where(`${target.table}.${target.softDeletes}`, null)
  }

  /**
   * here we transform fields to be selected from table. This transformation 
   * is required for relationships where pivot tables are in use.
  */
  relation.transformSelectColumns(target.activeConnection._statements, target._withPivot, target._pivotTable)

  return new Promise(function (resolve, reject) {

    target.activeConnection.then(function (values) {

      if(target.activeConnection._single && target.activeConnection._single.limit && target.activeConnection._single.limit === 1){
        values = values[0]
      }

      /**
       * here we set visibility of values fetched
       * from model query.
       */
      values = helper.setVisibility(target, values)

      /**
       * finally before returning we need to mutate values
       * by calling getters defined on model
       */
      values = helper.mutateValues(target, values)

      /**
       * if any relations have been defined using with method , simply fetch 
       * them as attach them to final values
       */
      if(target._relations && target._relations.length && values.size() > 0){
        return relation.fetchRelated(target, values, target._relations)
      }

      return values

    }).then(function (response) {

      /**
       * here we empty query chain after returning all data, it is required
       * otherwise old methods will be called while making a new query
      */
      target.new()
      resolve(response)

    }).catch(reject)
  })
}

/**
 *
 * @function find
 * @description find methods returns a model instance with single user
 * attributes attached to model attributes
 * @param  {Object} target
 * @param  {Number} id
 * @return {Object}
 * @public
 */
query.find = function (target, id) {
  return new Promise(function (resolve, reject) {
    target
      .activeConnection
      .where(target.primaryKey, id)
      .first()
      .then(function (values) {
        values = helper.mutateRow(target, values)
        let instance = new target(values)
        instance.connection.where(target.primaryKey, id)
        resolve(instance)
      })
      .catch(reject)
      .finally(function () {
        /**
         * here we empty query chain after returning all data, it is required
         * otherwise old methods will be called while making a new query
         */
        target.new()
      })
  })
}

/**
 * @function all
 * @description clone of fetch by fetching all values without
 * any where clause
 * @param  {Object} target
 * @return {Object}
 * @public
 */
query.all = function (target) {
  return query.fetch(target)
}

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
query.create = function (target, values, isMutated, connection) {
  connection = connection || target.activeConnection

  /**
   * here we use given connection or falls back to
   * default connection on model static interface
   */

  if (!isMutated) {
    values = modelHelper.mutateSetters(target.prototype, values)
  }

  if (target.timestamps) {
    values = modelHelper.addTimeStamps(values, ['created_at', 'updated_at'])
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
query.update = function (target, values, isMutated, connection) {
  connection = connection || target.activeConnection

  if (!isMutated) {
    values = modelHelper.mutateSetters(target.prototype, values)
  }
  if (target.timestamps) {
    values = modelHelper.addTimeStamps(values, ['updated_at'])
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
query.delete = function (target, connection) {
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
query.forceDelete = function (target, connection) {
  connection = connection || target.activeConnection

  const deleteQuery = connection.del()
  target.new()
  return deleteQuery
}
