'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const methods = exports = module.exports = {}

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
    const baseSerializer = new target.HostModel.QuerySerializer(target, this)
    return yield baseSerializer.fetch()
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
 * deletes rows inside the database only when soft deletes are enabled.
 * Otherwise it will update the model with delete timestamp.
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
 * restores a soft deleted row
 *
 * @method restoreAttributes
 *
 * @param  {Object}          target
 * @return {Promise}
 *
 * @public
 */
methods.restoreAttributes = function (target) {
  return function (values) {
    if (!target.HostModel.deleteTimestamp) {
      throw new Error('Restore can only be done when soft deletes are enabled.')
    }
    values = values || {}
    values = target.HostModel.prototype.setRestoreTimestamp(values)
    return this.updateAttributes(values)
  }
}
methods.restore = methods.restoreAttributes

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
    this.whereNotNull(target.HostModel.deleteTimestamp)
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
    target.eagerLoad.with(relations)
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
    target.eagerLoad.appendScope(key, callback)
    return this
  }
}
