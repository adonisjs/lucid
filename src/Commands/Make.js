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
 * @description writes file with content to a given path
 * @method writeFile
 * @param  {String}  migrationPath
 * @param  {String}  migrationContent
 * @return {Object}
 * @public
 */
Make.writeFile = function (migrationPath, migrationContent) {
  return new Promise((resolve, reject) => {
    fs.writeFile(migrationPath, migrationContent, function (error) {
      if (error) {
        return reject(error)
      }
      resolve()
    })
  })
}

/**
 * @description creates a new migration file
 * @method handle
 * @param  {Object} options
 * @param  {Object} flags
 * @return {Object}
 * @public
 */
Make.handle = function * (options) {
  const helpers = Ioc.make('Adonis/Src/Helpers')
  const Ansi = Ioc.use('Adonis/Src/Ansi')

  const name = `${new Date().getTime()}_${options.name}.js`
  const migrationPath = helpers.migrationsPath(name)

  yield Make.writeFile(migrationPath, migrationContent)
  Ansi.success(Ansi.icon('success') + ' created %s migration successfully', name)
}
