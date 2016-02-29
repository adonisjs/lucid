'use strict'

/**
 * adonis-framework
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Hooks = exports = module.exports = {}
const _ = require('lodash')

/**
 * compose hooks for a given type by reading values
 * from $modelHooks
 *
 * @method composeHooks
 *
 * @param  {String}     type
 * @return {Object}
 *
 * @public
 */
Hooks.getHooks = function (type, handler) {
  let beforeHooks = []
  let afterHooks = []
  const modelHooks = this.constructor.$modelHooks
  if (!modelHooks) {
    return [handler]
  }
  if (modelHooks[`before${type}`]) {
    beforeHooks = _.map(modelHooks[`before${type}`], function (hook) { return hook.handler })
  }
  if (modelHooks[`after${type}`]) {
    afterHooks = _.map(modelHooks[`after${type}`], function (hook) { return hook.handler })
  }
  return beforeHooks.concat([handler]).concat(afterHooks)
}

/**
 * compose an array of hooks and call them sequentially until
 * next is called.
 *
 * @method composeHooks
 *
 * @param  {Object}     scope
 * @param  {Array}     hooks
 * @return {Function}
 *
 * @public
 */
Hooks.composeHooks = function (scope, hooks) {
  function * noop () {}
  return function * (next) {
    next = next || noop()
    let i = hooks.length
    while (i--) {
      const hook = hooks[i]
      next = hook.apply(scope, [next])
    }
    yield * next
  }
}

/**
 * executes before and after Insert hooks with the actual
 * insert handler.
 *
 * @method executeInsertHooks
 *
 * @param  {Object}            scope
 * @param  {Function}            insertHandler
 * @return  {Boolean}
 *
 * @public
 */
Hooks.executeInsertHooks = function * (scope, insertHandler) {
  let handlerResult = null
  const insertHandlerWrapper = function * (next) {
    handlerResult = yield insertHandler.call(this)
    yield next
  }
  const hooksChain = this.getHooks('Create', insertHandlerWrapper)
  yield this.composeHooks(scope, hooksChain)
  return handlerResult
}

/**
 * executes before and after update hooks with the actual
 * update handler
 *
 * @method executeUpdateHooks
 *
 * @param  {Object}            scope
 * @param  {Function}          updateHandler
 * @return {Number}
 *
 * @public
 */
Hooks.executeUpdateHooks = function * (scope, updateHandler) {
  let handlerResult = null
  const updateHandlerWrapper = function * (next) {
    handlerResult = yield updateHandler.call(this)
    yield next
  }
  const hooksChain = this.getHooks('Update', updateHandlerWrapper)
  yield this.composeHooks(scope, hooksChain)
  return handlerResult
}

/**
 * executes before and after delete hooks with the actual
 * delete handler
 *
 * @method executeDeleteHooks
 *
 * @param  {Object}            scope
 * @param  {Function}          updateHandler
 * @return {Number}
 *
 * @public
 */
Hooks.executeDeleteHooks = function * (scope, deleteHandler) {
  let handlerResult = null
  const deleteHandlerWrapper = function * (next) {
    handlerResult = yield deleteHandler.call(this)
    yield next
  }
  const hooksChain = this.getHooks('Delete', deleteHandlerWrapper)
  yield this.composeHooks(scope, hooksChain)
  return handlerResult
}
