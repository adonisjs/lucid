'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const GE = require('@adonisjs/generic-exceptions')
const debug = require('debug')('adonis:lucid')

/**
 * Scope iterator to execute all the global scopes. Also this class allows filtering scopes at runtime for a single query
 *
 * @class ScopeIterator
 *
 * @param {Array} scopes
 */
class ScopeIterator {
  constructor (scopes) {
    this._scopes = scopes
    this._ignoreList = []
  }

  /**
   * Ignore an array of scopes or ignore all the scopes for a given query
   *
   * @param {Array} scopes Array of scope names to ignore
   *
   * @chainable
   */
  ignore (scopes) {
    if (scopes && !Array.isArray(scopes)) {
      throw GE.InvalidArgumentException.invalidParameter('ignoreScopes expects an array of names to ignore', scopes)
    }

    const scopesToIgnore = scopes || ['*']
    this._ignoreList = this._ignoreList.concat(scopesToIgnore)
    return this
  }

  /**
   * Execute all the scopes of the iterator, ignore scopes will not be executed
   *
   * @param {Object} builder Query builder reference
   *
   * @return void
   */
  execute (builder) {
    if (this._ignoreList.indexOf('*') > -1) {
      debug('returning early since all scopes have been ignored')
      return
    }

    this._scopes
      .filter((scope) => {
        if (this._ignoreList.indexOf(scope.name) > -1) {
          debug('ignoring scope %s', scope.name)
          return false
        }
        return true
      })
      .forEach((scope) => {
        scope.callback(builder)
      })

    /**
     * Cleaning up to avoid duplicate execution of
     * same scopes
     */
    this._scopes = []
    this._ignoreList = []
  }
}

class GlobalScopes {
  constructor () {
    this.scopes = []
  }

  /**
   * Add a new scope to the scopes lists.
   *
   * @param {Function} callback
   * @param {String}   [name]
   *
   * @chainable
   */
  add (callback, name = null) {
    /**
     * Ensure callback is a function
     */
    if (typeof (callback) !== 'function') {
      throw GE.InvalidArgumentException.invalidParameter('Model.addGlobalScope expects a closure as first parameter', callback)
    }

    /**
     * Ensure if name exists, must be a string
     */
    if (name && typeof (name) !== 'string') {
      throw GE.InvalidArgumentException.invalidParameter('Model.addGlobalScope expects a string for the scope name', name)
    }

    /**
     * Cannot register duplicate named global scopes
     */
    if (name && this.scopes.find((scope) => scope.name && scope.name === name)) {
      throw GE.RuntimeException.invoke(`A scope with name ${name} alredy exists. Give your scope a unique name`)
    }

    this.scopes.push({ callback, name })
    return this
  }

  /**
   * Returns a new itterator to apply runtime filters and execute scope callbacks
   *
   * @returns {ScopeIterator}
   */
  iterator () {
    return new ScopeIterator(this.scopes)
  }
}

module.exports = GlobalScopes
