'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/
const fs = require('fs-extra')
module.exports = {
  make: function (file) {
    return new Promise(function (resolve, reject) {
      fs.ensureFile(file, function (error) {
        if(error) {
          reject(error)
        }
        else {
          resolve()
        }
      })
    })
  },
  remove: function (file) {
    return new Promise(function (resolve, reject) {
      fs.remove(file, function (error) {
        if(error) {
          reject(error)
        }
        else {
          resolve()
        }
      })
    })
  }
}
