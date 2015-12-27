'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const targetKeys = ['up', 'store', 'down']

const proxiedNames = {
  create: 'createTable',
  drop: 'dropTable',
  has: 'hasTable',
  rename: 'renameTable',
  dropIfExists: 'dropTableIfExists',
  createIfNotExists: 'createTableIfNotExists'
}

let proxy = exports = module.exports = {}

/**
 * @description proxies target get calls and returns custom
 * @method get
 * @param  {Object} target
 * @param  {String} name
 * @return {Mixed}
 * @public
 */
proxy.get = function (target, name) {
  /**
   * return original implmentation from class if name is one of
   * the defined names in targetKeys array
   */
  if (targetKeys.indexOf(name) > -1) {
    return target[name]
  }

  /**
   * return a function to be used for proxying schema builder calls
   */
  return function (key, callback) {
    if (Object.keys(proxiedNames).indexOf(name) > -1) {
      name = proxiedNames[name]
    }
    target.store[name] = {key, callback}
  }
}
