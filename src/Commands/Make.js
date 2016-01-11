'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const fs = require('fs')
const Ioc = require('adonis-fold').Ioc
const i = require('i')()

/**
 * @description migration file startup code
 * @type {String}
 */
const migrationContent = `
'use strict'

const Schema = use('Schema')

class {{Schema}} extends Schema {

  up () {
    {{up}}
  }

  down () {
    {{down}}
  }

}

module.exports = {{Schema}}
`

let Make = exports = module.exports = {}
Make.description = 'Create a new migration file'
Make.signature = '{name} {--table?:Name of the table you want to modify} {--create?:Name of the table you want to create}'

/**
 * @description returns code block for create or
 * update table.
 * @method _up
 * @param  {String} table       [description]
 * @param  {Boolean} createTable [description]
 * @return {String}             [description]
 * @public
 */
Make._up = function (table, createTable) {
  if (createTable) {
    return `this.create('${table}', function (table) {
      table.increments('id')
      table.timestamps()
      table.timestamp('deleted_at')
    })`
  }
  return `this.table('${table}', function (table) {
    })`
}

/**
 * @description returns code block for drop or
 * update table
 * @method _down
 * @param  {String} table       [description]
 * @param  {Boolean} createTable [description]
 * @return {String}             [description]
 */
Make._down = function (table, createTable) {
  if (createTable) {
    return `this.drop('${table}')`
  }
  return ''
}

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
Make.handle = function *(options, flags) {
  const helpers = Ioc.make('Adonis/Src/Helpers')
  const Ansi = Ioc.use('Adonis/Src/Ansi')
  let className = 'NewSchema'
  let isCreate = true
  let tableName = '<table>'

  /**
   * if create flag is passed, mark the process as creating
   * a table
   */
  if (typeof (flags.create) === 'string') {
    tableName = flags.create
    className = i.camelize(tableName)
  }

  /**
   * if update flag is passed, mark the process as updating
   * a table
   */
  if (typeof (flags.table) === 'string') {
    tableName = flags.table
    className = i.camelize(tableName)
    isCreate = false
  }

  /**
   * @description replaces dynamic
   * code blocks with values
   * @type {String}
   */
  const formattedContent = migrationContent
    .replace(/{{Schema}}/g, className)
    .replace('{{up}}', Make._up(tableName, isCreate))
    .replace('{{down}}', Make._down(tableName, isCreate))

  const name = `${new Date().getTime()}_${options.name}.js`
  const migrationPath = helpers.migrationsPath(name)

  yield Make.writeFile(migrationPath, formattedContent)
  Ansi.success(Ansi.icon('success') + ' created %s migration successfully', name)
}
