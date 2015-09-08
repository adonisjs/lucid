'use strict'

const helpers = require('./helpers')

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
 */
mapper.get = function (target, name) {
  /**
   * if property exists on class , return that
   * first
   */
  if (target[name]) {
    return target[name]
  }

  if (name === 'withTrashed') {
    return function () {
      target.disableSoftDeletes = true
      return this
    }
  }

  if (name === 'find') {
    return function (id) {
      return new Promise(function (resolve, reject) {
        target
          .activeConnection
          .where('id', id)
          .first()
          .then(function (values) {
            let instance = new target(values)
            instance.connection.where('id', id)
            resolve(instance)
          }).catch(reject).finally(function () {
          target.activeConnection._statements = []
        })
      })
    }
  }

  /**
   * hijack then method here to return values as
   * instance of collection class
   */
  if (name === 'then') {
    if (target.softDeletes && !target.disableSoftDeletes) {
      target.activeConnection.where(target.softDeletes, null)
    }
    return function (cb) {
      return target.activeConnection[name](function (values) {
        target.disableSoftDeletes = false
        values = helpers.setVisibility(target, values)
        values = helpers.mutateValues(target, values)
        cb(values)
      }).finally(function () {
        target.activeConnection._statements = []
      })
    }
  }

  const scopeFunction = helpers.makeScoped(target, name)
  /**
   * check to see if method is one of the scoped
   * methods or not, if method falls into a
   * scope method call that and pass current
   * query
   */
  if (scopeFunction) {
    return function () {
      return scopeFunction(this.activeConnection)
    }
  }

  /**
   * finally if above checks fails , think of the
   * method as a query builder method.
   */
  return target.activeConnection[name]

}

mapper.set = function (target, name, value) {
  target[name] = value
}

/**
 * @function construct
 * @description returns new instance of class
 * when someone asks for a new instance.
 * @param  {Class} target
 * @return {Object}
 */
mapper.construct = function (target, options) {
  var _bind = Function.prototype.bind
  return new (_bind.apply(target, [null].concat(options)))()
}
