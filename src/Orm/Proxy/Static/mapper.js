'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const helpers = require('./helpers')
const hijacker = require('./hijacker')
const _ = require('lodash')

/**
 * @module mapper
 * @description Proxy methods for class defination
 */
let mapper = exports = module.exports = {}

/**
 * @function get
 * @description This method proxy all get requests
 * of a given class. Here we add custom logic
 * to find best match for a given property
 * @param  {Class} target
 * @param  {String} name
 * @return {*}
 * @public
 */
mapper.get = function (target, name) {
  /**
   * if property exists on class , return that
   * first
   */
  if (target[name]) {
    return target[name]
  }

  /**
   * if prototype exists as a instance property on class
   * then call it
   */
  if (target.prototype[name]) {
    return target.prototype[name]
  }

  /**
   * if method name is withTrashed , return a new
   * function by setting soft deletes to false
   * till query instance.
   */
  if (name === 'withTrashed') {
    return function () {
      target.disableSoftDeletes = true
      return this
    }
  }

  /**
   * if name is find , then return a new function by
   * fetching data and set value as model instance
   */
  if (name === 'find') {
    return function (id) {
      return hijacker.find(target, id)
    }
  }

  /**
   * if name is all , then return a new function by
   * fetching all values from a given table
   */
  if (name === 'all') {
    return function () {
      return hijacker.all(target)
    }
  }

  /**
   * implement fetch method here to return values as
   * instance of collection class
   */
  if (name === 'fetch') {
    return function () {
      return hijacker.fetch(target, name)
    }
  }

  /**
   * implement `with` method here to fetch related models
   * with target model result
   */
  if (name === 'with') {
    return function () {
      target._relations = _.values(arguments)
      return this
    }
  }

  /**
   * if scope method is called , set relation
   * scope to be used by fetch method
   */
  if (name === 'scope'){
    return function (key, callback) {

      key = key.split('.')

      if(key.length > 1){
        const nestedScope = _.rest(key).join('.')
        target._nestedScope[nestedScope] = callback
      }else{
        key = key[0]
        target._relationsScope[key] = callback
      }
      return this
    }
  }

  /**
   * setting up pivot columns to be fetched while making
   * many to many relation. Make sure this value will
   * be set on relational model, not on host model.
   */
  if(name === 'withPivot'){
    return function () {
      target._withPivot = _.values(arguments)
      return this
    }
  }

  /**
   * check to see if method is one of the scoped
   * methods or not, if method falls into a
   * scope method call that and pass current
   * query
   */
  const scopeFunction = helpers.makeScoped(target, name)
  if (scopeFunction) {
    return function () {
      const args = [this.activeConnection].concat(_.values(arguments))
      scopeFunction.apply(target,args)
      return this
    }
  }

  /**
   * finally if above checks fails , think of the
   * method as a query builder method.
   */
  return target.activeConnection[name]

}

/**
 * @function set
 * @description setter for proxy
 * @param {Object} target
 * @param {String} name
 * @param {*} value
 * @publc
 */
mapper.set = function (target, name, value) {
  target[name] = value
}

/**
 * @function construct
 * @description returns new instance of class
 * when someone asks for a new instance.
 * @param  {Class} target
 * @return {Object}
 * @publc
 */
mapper.construct = function (target, options) {
  var _bind = Function.prototype.bind
  return new (_bind.apply(target, [null].concat(options)))()
}
