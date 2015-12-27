'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const fs = require('fs')
const Ioc = require('adonis-fold').Ioc

const migrationContent = `
'use strict'

const Schema = use('Schema')

class NewSchema extends Schema {

  up () {
  }

  down () {
  }

}

module.exports = NewSchema
`

let Make = exports = module.exports = {}

Make.description = 'Create a new migration file'
Make.signature = '{name}'

/**
 * @description creates a new migration file
 * @method handle
 * @param  {Object} options
 * @param  {Object} flags
 * @return {Object}
 * @public
 */
Make.handle = function (options) {
  const helpers = Ioc.make('Adonis/Src/Helpers')
  return new Promise((resolve, reject) => {
    const name = `${new Date().getTime()}_${options.name}.js`
    const migrationPath = helpers.migrationsPath(name)

    fs.writeFile(migrationPath, migrationContent, function (error) {
      if (error) {
        reject(error)
      } else {
        resolve(`Created ${name} migration successfully`)
      }
    })
  })
}
