'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const { resolver } = require('@adonisjs/fold')
const CE = require('../../Exceptions')

/**
 * This class is used internally by @ref('Model') to add
 * hooks functionality.
 *
 * Hooks are executed in sequence for a given event.
 *
 * @class Hooks
 * @constructor
 */
class Hooks {
  constructor () {
    this._events = ['create', 'update', 'delete', 'restore', 'find']

    /**
     * The event aliases. Whenever a handler is saved for a alias,
     * it will called when those events occurs.
     *
     * @type {Object}
     */
    this._aliases = {
      create: 'save',
      update: 'save'
    }

    /**
     * A map of handlers to be called for each event
     *
     * @type {Object}
     */
    this._handlers = {}
  }

  /**
   * Adds a new handler for an event. Make sure to give
   * handler a unique name if planning to remove it
   * later at runtime
   *
   * @method addHandler
   *
   * @param  {String}   event
   * @param  {Function|String}   handler
   * @param  {String}   [name]
   *
   * @return {void}
   *
   * @example
   * ```
   * this.addHandler('create', async function () {
   * })
   * ```
   */
  addHandler (event, handler, name) {
    if (!this._events[event]) {
      // error
    }
    this._handlers[event] = this._handlers[event] || []
    this._handlers[event].push({ handler, name })
  }

  /**
   * Removes handler using it's name. This methods returns
   * void when successfully executed, otherwise an
   * exception is thrown.
   *
   * @method removeHandler
   *
   * @param  {String}      event
   * @param  {String}      name
   *
   * @return {void}
   *
   * @example
   * ```js
   * this.removeHandler('create', 'updatePassword')
   * ```
   *
   * @throws {InvalidArgumentException} If `name` is missing
   */
  removeHandler (event, name) {
    if (!name) {
      throw CE.InvalidArgumentException.missingParameter('Cannot remove hook without a name')
    }
    _.remove(this._handlers[event], (handler) => handler.name === name)
  }

  /**
   * Removes all handlers for a given event. This method
   * returns void when successfully executed, otherwise
   * an exception is thrown.
   *
   * @method removeAllHandlers
   *
   * @param  {String}          event
   *
   * @return {void}
   *
   * @example
   * ```
   * this.removeAllHandlers('create')
   * ```
   */
  removeAllHandlers (event) {
    /**
     * Don't create an empty array of events when there was
     * not one.
     */
    if (!this._handlers[event]) {
      return
    }
    this._handlers[event] = []
  }

  /**
   * Execute hooks in sequence. If this method doesn't
   * throws an exception, means everything went fine.
   *
   * @method exec
   * @async
   *
   * @param  {String} event
   * @param  {Object} ctx
   *
   * @return {void}
   */
  async exec (event, ctx) {
    const handlers = this._handlers[event] || []
    const aliasesHandlers = this._aliases[event] ? this._handlers[this._aliases[event]] || [] : []
    const allHandlers = handlers.concat(aliasesHandlers)

    /**
     * Return if there are no handlers for a given
     * event
     */
    if (!allHandlers.length) {
      return
    }

    /**
     * Execute all handlers in sequence
     */
    for (let handler of allHandlers) {
      const { method } = resolver.forDir('modelHooks').resolveFunc(handler.handler)
      await method(ctx)
    }
  }
}

module.exports = Hooks
