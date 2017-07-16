'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/

module.exports = {
  formatQuery: function (query) {
    if (process.env.DB === 'mysql') {
      return query.replace(/"/g, '`')
    }
    return query
  },

  formatBindings: function (bindings) {
    return bindings
  }
}
