/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, flags } from '@adonisjs/core/ace'
import { QueryClientContract } from '../src/types/database.js'
import { CommandOptions } from '@adonisjs/core/types/ace'

export default class DbWipe extends BaseCommand {
  static commandName = 'db:wipe'
  static description = 'Drop all tables, views and types in database'
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
   * Drop all views in database
   */
  @flags.boolean({ description: 'Drop all views' })
  declare dropViews: boolean

  /**
   * Drop all types in database
   */
  @flags.boolean({ description: 'Drop all custom types (Postgres only)' })
  declare dropTypes: boolean

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
   * Prompts to take consent when wiping the database in production
   */
  private async takeProductionConstent(): Promise<boolean> {
    const question = 'You are in production environment. Want to continue wiping the database?'
    try {
      return await this.prompt.confirm(question)
    } catch (error) {
      return false
    }
  }

  /**
   * Drop all views (if asked for and supported)
   */
  private async performDropViews(client: QueryClientContract, schemas: string[]) {
    if (!this.dropViews) {
      return
    }

    if (!client.dialect.supportsViews) {
      this.logger.warning(`Dropping views is not supported by "${client.dialect.name}"`)
    }

    await client.dropAllViews(schemas)
    this.logger.success('Dropped views successfully')
  }

  /**
   * Drop all tables
   */
  private async performDropTables(client: QueryClientContract, schemas: string[]) {
    await client.dropAllTables(schemas)
    this.logger.success('Dropped tables successfully')
  }

  /**
   * Drop all types (if asked for and supported)
   */
  private async performDropTypes(client: QueryClientContract, schemas: string[]) {
    if (!this.dropTypes) {
      return
    }

    if (!client.dialect.supportsTypes) {
      this.logger.warning(`Dropping types is not supported by "${client.dialect.name}"`)
    }

    await client.dropAllTypes(schemas)
    this.logger.success('Dropped types successfully')
  }

  /**
   * Run as a subcommand. Never close database connections or exit
   * process inside this method
   */
  private async runAsSubCommand() {
    const db = await this.app.container.make('lucid.db')
    this.connection = this.connection || db.primaryConnectionName
    const connection = db.connection(this.connection || db.primaryConnectionName)

    /**
     * Continue with clearing the database when not in production
     * or force flag is passed
     */
    let continueWipe = !this.app.inProduction || this.force
    if (!continueWipe) {
      continueWipe = await this.takeProductionConstent()
    }

    /**
     * Do not continue when in prod and the prompt was cancelled
     */
    if (!continueWipe) {
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

    let schemas: string[] = ['public']
    if ('searchPath' in managerConnection.config && managerConnection.config.searchPath) {
      schemas = managerConnection.config.searchPath
    }

    await this.performDropViews(connection, schemas)
    await this.performDropTables(connection, schemas)
    await this.performDropTypes(connection, schemas)
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
