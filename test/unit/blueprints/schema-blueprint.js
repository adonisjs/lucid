'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const fs = require('fs')
const path = require('path')

module.exports = function () {
  return new Promise(function (resolve, reject) {
    fs.writeFile(path.join(__dirname, '../storage/schema.sqlite3'), '', function (err) {
      if(err) {
        reject(err)
      }
      resolve()
    })
  })
}
