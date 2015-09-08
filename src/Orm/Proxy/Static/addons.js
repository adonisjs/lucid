'use strict'

const modelHelpers = require('../Model/helpers')

let addons = exports = module.exports = {}

addons.create = function (target, values, isMutated, connection) {
  connection = connection || target.activeConnection

  if (!isMutated) {
    values = modelHelpers.mutateSetters(target.prototype, values)
  }
  if (target.timestamps) {
    values = modelHelpers.addTimeStamps(values, ['created_at', 'updated_at'])
  }
  return connection.insert(values)
}

addons.update = function (target, values, isMutated, connection) {
  connection = connection || target.activeConnection

  if (!isMutated) {
    values = modelHelpers.mutateSetters(target.prototype, values)
  }
  if (target.timestamps) {
    values = modelHelpers.addTimeStamps(values, ['updated_at'])
  }
  return connection.update(values)
}

addons.delete = function (target, connection) {
  connection = connection || target.activeConnection

  if (target.softDeletes) {
    return connection.update(target.softDeletes, new Date())
  } else {
    return connection.del()
  }
}

addons.forceDelete = function (target, connection) {
  connection = connection || target.activeConnection

  return connection.del()
}
