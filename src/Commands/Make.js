'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

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

const fs = require('fs')

class Make {

  constructor (Helpers) {
    this.helpers = Helpers
  }

  /**
   * @description returns command description
   * @method description
   * @return {String}
   * @public
   */
  description () {
    return 'Create a new migration file'
  }

  /**
   * @description command signature to define expectation for
   * a given command to ace
   * @method signature
   * @return {String}
   * @public
   */
  signature () {
    return '{name}'
  }

  /**
   * @description creates a new migration file
   * @method handle
   * @param  {Object} options
   * @param  {Object} flags
   * @return {Object}
   * @public
   */
  handle (options) {
    return new Promise((resolve, reject) => {
      const name = `${new Date().getTime()}_${options.name}.js`
      const migrationPath = this.helpers.migrationsPath(name)

      fs.writeFile(migrationPath, migrationContent, function (error) {
        if (error) {
          reject(error)
        } else {
          resolve(`Created ${name} migration successfully`)
        }
      })
    })
  }
}

module.exports = Make
