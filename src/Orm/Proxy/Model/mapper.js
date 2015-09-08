'use strict'

const helpers = require('./helpers')

let mapper = exports = module.exports = {}

mapper.get = function (target, name) {
  if (target[name]) {
    return target[name]
  }

  if (target.attributes[name]) {
    return target.attributes[name]
  }

}

mapper.set = function (target, name, value) {
  const setter = helpers.mutateField(target, name)
  target.attributes[name] = setter ? setter(value) : value
}
