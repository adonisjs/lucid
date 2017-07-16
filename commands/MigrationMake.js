'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const path = require('path')
const { Command } = require('@adonisjs/ace')
const _ = require('lodash')

const util = require('../lib/util')

class MigrationMake extends Command {
  static get inject () {
    return ['Adonis/Src/Helpers']
  }

  /**
   * Command signature required by ace
   *
   * @method signature
   *
   * @return {String}
   */
  static get signature () {
    return `
    make:migration
    { name: Name of migration file, current timestamp will be prepended to the name }
    { --action?=@value : Choose an action to \`create\` or \`select\` a table }
    `
  }

  /**
   * Command description
   *
   * @method description
   *
   * @return {String}
   */
  static get description () {
    return 'Create a new migration file'
  }

  constructor (helpers) {
    super()
    this.helpers = helpers
  }

  /**
   * Method to be called when this command is executed
   *
   * @method handle
   *
   * @param  {String} options.name
   * @param  {String} options.action
   *
   * @return {void|String} - Returns abs path to created file when command
   *                         is not executed by ace.
   */
  async handle ({ name }, { action }) {
    name = _.upperFirst(_.camelCase(name))

    /**
     * Prompt for action if missing
     */
    if (!action) {
      action = await this.choice('Choose an action', [
        {
          value: 'create',
          name: 'Create table'
        },
        {
          value: 'select',
          name: 'Select table'
        }
      ])
    }

    const makeTemplate = await this.readFile(path.join(__dirname, './templates/make.mustache'), 'utf-8')
    const fileName = this.helpers.migrationsPath(`${new Date().getTime()}_${name}.js`)

    /**
     * Generate the file using template
     */
    await this.generateFile(fileName, makeTemplate, {
      create: action === 'create',
      table: util.makeTableName(name),
      name: name
    })

    this.completed('make:migration', fileName.replace(`${this.helpers.databasePath()}${path.sep}`, ''))

    if (!this.viaAce) {
      return fileName
    }
  }
}

module.exports = MigrationMake
