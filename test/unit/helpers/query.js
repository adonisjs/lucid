'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2016-2016 Harminder Virk
 * MIT Licensed
*/

const _ = require('lodash')

module.exports = {
  formatQuery: function (query) {
    if(process.env.DB === 'mysql') {
      return query.replace(/"/g, '`')
    }
    return query
  },

  formatBindings: function (bindings) {
    if(process.env.DB === 'pg') {
      return _.map(bindings, function (binding) {
        return binding.toString()
      })
    }
    return bindings
  }
}
