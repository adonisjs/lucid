/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, flags } from '@adonisjs/core/ace'
import { type CommandOptions } from '@adonisjs/core/types/ace'
import { DatabaseAdministrator } from '../src/database_administrator/index.js'

export default class DbDrop extends BaseCommand {
  static commandName = 'db:drop'
  static description = 'Drop the database of the given connection'
  static options: CommandOptions = {
    startApp: true,
  }

  /**
   * Choose a custom pre-defined connection. Otherwise, we use the
   * default connection
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  declare connection: string

  /**
   * Force command execution in production
   */
  @flags.boolean({ description: 'Explicitly force command to run in production' })
  declare force: boolean

  /**
   * Not a valid connection
   */
  private printNotAValidConnection(connection: string) {
    this.logger.error(
      `"${connection}" is not a valid connection name. Double check "config/database" file`
    )
  }

  /**
   * Prompts to take consent when dropping the database in production
   */
  private async takeProductionConsent(): Promise<boolean> {
    const question = 'You are in production environment. Want to continue dropping the database?'
    try {
      return await this.prompt.confirm(question)
    } catch (error) {
      return false
    }
  }

  /**
   * Run as a subcommand. Never close database connections or exit
   * process inside this method
   */
  private async runAsSubCommand() {
    const db = await this.app.container.make('lucid.db')
    this.connection = this.connection || db.primaryConnectionName

    /**
     * Continue with dropping the database when not in production
     * or force flag is passed
     */
    let continueDrop = !this.app.inProduction || this.force
    if (!continueDrop) {
      continueDrop = await this.takeProductionConsent()
    }

    /**
     * Do not continue when in prod and the prompt was cancelled
     */
    if (!continueDrop) {
      return
    }

    /**
     * Invalid database connection
     */
    const managerConnection = db.manager.get(this.connection)
    if (!managerConnection) {
      this.printNotAValidConnection(this.connection)
      this.exitCode = 1
      return
    }

    /**
     * We cannot drop a database over a connection attached to it,
     * therefore we do not use the lucid connection and instead
     * connect to the dialect maintenance database
     */
    const administrator = new DatabaseAdministrator(managerConnection.config)

    try {
      const databaseName = administrator.databaseName

      if (!(await administrator.databaseExists())) {
        this.logger.info(`Database "${databaseName}" does not exist`)
        return
      }

      await administrator.dropDatabase()
      this.logger.success(`Dropped database "${databaseName}"`)
    } finally {
      await administrator.disconnect()
    }
  }

  /**
   * Branching out, so that if required we can implement
   * "runAsMain" separately from "runAsSubCommand".
   *
   * For now, they both are the same
   */
  private async runAsMain() {
    await this.runAsSubCommand()
  }

  /**
   * Handle command
   */
  async run(): Promise<void> {
    if (this.isMain) {
      await this.runAsMain()
    } else {
      await this.runAsSubCommand()
    }
  }

  /**
   * Lifecycle method invoked by ace after the "run"
   * method.
   */
  async completed() {
    if (this.isMain) {
      const db = await this.app.container.make('lucid.db')
      await db.manager.closeAll(true)
    }
  }
}
