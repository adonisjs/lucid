'use strict'

const UsersHooks = exports = module.exports = {}

UsersHooks.validate = function * (next) {
  this.username = 'viahook'
  yield next
}
