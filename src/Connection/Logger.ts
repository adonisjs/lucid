/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { LoggerContract } from '@ioc:Adonis/Core/Logger'

/**
 * Custom knex logger that uses adonisjs logger under the
 * hood.
 */
export class Logger {
  public warn = function (message: any) {
    this.addConnectionName(message)
    this.adonisLogger.warn(message)
  }.bind(this)

  public error = function (message: any) {
    this.addConnectionName(message)
    this.adonisLogger.error(message)
  }.bind(this)

  public deprecate = function (message: any) {
    this.addConnectionName(message)
    this.adonisLogger.info(message)
  }.bind(this)

  public debug = function (message: any) {
    this.addConnectionName(message)
    this.adonisLogger.debug(message)
  }.bind(this)

  public addConnectionName (message: any) {
    if (typeof (message) !== 'string') {
      message.connection = this.name
    }
  }

  constructor (public name: string, public adonisLogger: LoggerContract) {
  }
}
