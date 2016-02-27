'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const util = require('../../../lib/util')
const _ = require('lodash')
const helpers = require('./helpers')
const methods = exports = module.exports = {}

/**
 * this method override the original lodash toJSON method
 * as it will also call toJSON to child model instances
 * inside the final collection array.
 *
 * @method toJSON
 *
 * @param  {Object} values
 * @return {Object}
 *
 * @public
 */
const toJSON = function (values) {
  return util.lodash().transform(values, (result, value, index) => {
    result[index] = value.toJSON()
  })
}

/**
 * here we replace lodash toJSON with a custom implementation,
 * as we need to call to JSON to model instance too.
 */
util.addMixin('toJSON', toJSON, {chain: false})

/**
 * fetches query results and wrap it inside a collection
 * of model instances.
 *
 * @method fetch
 *
 * @param  {Object} target
 * @return {Function}
 *
 * @public
 */
methods.fetch = function (target) {
  return function * () {
    /**
     * call all global scope methods before executing
     * the query builder chain.
     */
    const globalScope = target.HostModel.globalScope
    let eagerlyFetched = []
    if (_.size(globalScope)) {
      _.each(globalScope, (scopeMethod) => {
        scopeMethod(this)
      })
    }

    let results = yield target.modelQueryBuilder
    if (_.size(target.eagerLoad.relations) && _.size(results)) {
      eagerlyFetched = yield helpers.eagerLoadAndMap(results, target.eagerLoad, target.HostModel)
    }

    /**
     * here we convert an array to a collection, and making sure each
     * item inside an array is an instance of it's parent model.
     */
    return util.toCollection(results).transform((result, value, index) => {
      const modelInstance = new target.HostModel()
      modelInstance.attributes = value
      modelInstance.original = _.clone(modelInstance.attributes)
      helpers.populateRelationValues(modelInstance, eagerlyFetched, value)
      result[index] = modelInstance
    })
  }
}

/**
 * inserts values inside the database and touches create
 * and update timestamps. This method does not allows
 * bulk inserts.
 *
 * @method insertAttributes
 *
 * @param  {Object} target
 * @return {Promise}
 *
 * @public
 */
methods.insertAttributes = function (target) {
  return function (values) {
    values = target.HostModel.prototype.setCreateTimestamp(values)
    values = target.HostModel.prototype.setUpdateTimestamp(values)
    return target.modelQueryBuilder.insert(values)
  }
}

/**
 * update values inside the database and touches postupdate
 * timestamp. This method does not run bulkUpdate hooks.
 *
 * @method updateAttributes
 *
 * @param  {Object} target
 * @return {Promise}
 */
methods.updateAttributes = function (target) {
  return function (values) {
    values = target.HostModel.prototype.setUpdateTimestamp(values)
    return target.modelQueryBuilder.update(values)
  }
}
methods.update = methods.updateAttributes

/**
 * deletes rows inside the database only. When soft deletes are
 * on it will rather update the model with delete timestamp.
 * This methods does not run bulkDelete hooks.
 *
 * @method deleteAttributes
 *
 * @param  {Object} target
 * @return {Promise}
 *
 * @public
 */
methods.deleteAttributes = function (target) {
  return function (values) {
    if (target.HostModel.deleteTimestamp) {
      values = values || {}
      values = target.HostModel.prototype.setDeleteTimestamp(values)
      return this.updateAttributes(values)
    }
    return target.modelQueryBuilder.delete()
  }
}
methods.delete = methods.deleteAttributes

/**
 * returns the first record from data collection
 *
 * @method first
 *
 * @param  {Object} target
 * @return {Object}
 *
 * @public
 */
methods.first = function (target) {
  return function * () {
    target.modelQueryBuilder.limit(1)
    const results = yield this.fetch()
    return results.first() || null
  }
}

/**
 * with trashed will set a flag on query builder instance to
 * include trashed results.
 *
 * @method withTrashed
 *
 * @param  {Object}    target
 * @return {Object} - reference to this for chaining
 */
methods.withTrashed = function (target) {
  return function () {
    this.avoidTrashed = true
    return this
  }
}

/**
 * sets avoidtrashed on query builder chain to stop
 * soft deletes from running and add a clause
 * to pull all rows whose deleteTimestamp
 * is to null
 *
 * @method onlyTrashed
 *
 * @param  {Object}    target
 * @return {Object} - reference to this for chaining
 */
methods.onlyTrashed = function (target) {
  return function () {
    this.avoidTrashed = true
    this.whereNot(target.HostModel.deleteTimestamp, null)
    return this
  }
}

/**
 * sets up relations to be eager loaded when calling fetch method.
 * From here it is fetch method job to entertain withRelations
 * array.
 *
 *
 * @method with
 *
 * @param  {Object} target
 * @return {Object}        reference to this for chaining
 *
 * @public
 */
methods.with = function (target) {
  return function () {
    const relations = _.isArray(arguments[0]) ? arguments[0] : _.toArray(arguments)
    _.each(relations, (relation) => {
      relation = relation.split('.')
      const rootRelation = relation[0]
      target.eagerLoad.relations.push(rootRelation)
      if (_.size(relation) > 1) {
        target.eagerLoad.nestedRelations[rootRelation] = target.eagerLoad.nestedRelations[rootRelation] || []
        target.eagerLoad.nestedRelations[rootRelation].push(_.tail(relation).join('.'))
      }
    })
    return this
  }
}

/**
 * stores a callback for a given relation.
 *
 * @method scope
 *
 * @param  {Object} target
 * @return {Object}        - reference to this for chaining
 *
 * @public
 */
methods.scope = function (target) {
  return function (key, callback) {
    key = key.split('.')
    const rootScopeName = key[0]
    if (_.size(key) > 1) {
      const nestedScope = _.tail(key).join('.')
      target.eagerLoad.nestedScopes[rootScopeName] = target.eagerLoad.nestedScopes[rootScopeName] || {}
      target.eagerLoad.nestedScopes[rootScopeName][nestedScope] = callback
    } else {
      target.eagerLoad.relationScopes[rootScopeName] = callback
    }
    return this
  }
}
