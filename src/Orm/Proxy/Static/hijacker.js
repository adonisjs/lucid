'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const helpers = require('./helpers')

let hijacker = exports = module.exports = {}

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
hijacker.fetch = function (target) {
  /**
   * checking if soft deletes are enabled and user has not called withTrashed
   * , if above true conditions we will not fetch deleted values
   */
  if (target.softDeletes && !target.disableSoftDeletes) {
    target.activeConnection.where(`${target.table}.${target.softDeletes}`, null)
  }

  return new Promise(function (resolve, reject) {

    target.activeConnection.then(function (values) {

      if(target.activeConnection._single && target.activeConnection._single.limit && target.activeConnection._single.limit === 1){
        values = values[0]
      }

      /**
       * here we empty query chain after returning all data, it is required
       * otherwise old methods will be called while making a new query
      */
      target.new()
      /**
       * here we set visibility of values fetched
       * from model query.
       */
      values = helpers.setVisibility(target, values)

      /**
       * finally before returning we need to mutate values
       * by calling getters defined on model
       */
      values = helpers.mutateValues(target, values)

      resolve(values)

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
hijacker.find = function (target, id) {
  return new Promise(function (resolve, reject) {
    target
      .activeConnection
      .where(target.primaryKey, id)
      .first()
      .then(function (values) {
        values = helpers.mutateRow(target, values)
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
hijacker.all = function (target) {
  return hijacker.fetch(target)
}

/**
 * @function with
 * @description attaches results for related models
 * @param  {Object} target
 * @param  {Array} models
 * @return {Object}
 */
hijacker.with = function (target, models) {

  /**
   * my job is to fetch values for target model and then handover relations to
   * a helper method with required models. If target model is empty i will
   * resolve without fetching relations.
   */

  return new Promise(function(resolve, reject){
    hijacker
    .fetch(target)
    .then (function (result) {
      /**
       * if target model has entries , then only pull results for given
       * relationship.
       */
      if(result.size() > 0){
        return helpers.fetchRelated(target, result, models)
      }

      /**
       * other resolve with empty array collection , like normal fetch call
       * will result it.
      */
      resolve(result)
    })
    .then(resolve).catch(reject)
  })
}