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

class MakeConfig extends Command {
  constructor (Helpers) {
    super()
    this.Helpers = Helpers
  }

  /**
   * Ioc container injections
   *
   * @method inject
   *
   * @return {Array}
   */
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
    config:database
    { -c, --connection=@value: The database connection to use }
    { -e, --echo=@value: Write config to console }
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
    return 'Setup configuration for database provider'
  }

  async handle (args, { connection, echo }) {
    connection = connection || 'sqlite'
    const template = await this.readFile(path.join(__dirname, './templates/config.mustache'), 'utf-8')

    /**
     * Echo template over creating the config file
     */
    if (echo) {
      return this.viaAce ? console.log(template) : 'echoed'
    }

    /**
     * Create config file
     */
    const configPath = `${path.join(this.Helpers.configPath(), 'database.js')}`
    await this.generateFile(configPath, template, { connection })

    if (!this.viaAce) {
      return configPath
    }
    this.completed('created', configPath.replace(this.Helpers.appRoot(), '').replace(path.sep, ''))
  }
}

module.exports = MakeConfig
