'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const fs = require('co-fs-extra')
const path = require('path')

module.exports = {
  cleanStorage: function * () {
    return yield fs.emptyDir(path.join(__dirname,'../storage'))
  },
  createDir: function * () {
    return yield fs.ensureDir(path.join(__dirname,'../storage'))
  }
}

