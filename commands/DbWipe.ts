/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, flags } from '@adonisjs/core/build/standalone'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

export default class DbWipe extends BaseCommand {
  public static commandName = 'db:wipe'
  public static description = 'Drop all tables, views and types in database'
  public static settings = {
    loadApp: true,
  }

  /**
   * Choose a custom pre-defined connection. Otherwise, we use the
   * default connection
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  public connection: string

  /**
   * Drop all views in database
   */
  @flags.boolean({ description: 'Drop all views' })
  public dropViews: boolean

  /**
   * Drop all types in database
   */
  @flags.boolean({ description: 'Drop all custom types (Postgres only)' })
  public dropTypes: boolean

  /**
   * Force command execution in production
   */
  @flags.boolean({ description: 'Explicitly force command to run in production' })
  public force: boolean

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
    /**
     * Do not prompt when CLI is not interactive
     */
    if (!this.isInteractive) {
      return false
    }

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
  private async performDropViews(client: QueryClientContract) {
    if (!this.dropViews) {
      return
    }

    if (!client.dialect.supportsViews) {
      this.logger.warning(`Dropping views is not supported by "${client.dialect.name}"`)
    }

    await client.dropAllViews()
    this.logger.success('Dropped views successfully')
  }

  /**
   * Drop all tables
   */
  private async performDropTables(client: QueryClientContract) {
    await client.dropAllTables()
    this.logger.success('Dropped tables successfully')
  }

  /**
   * Drop all types (if asked for and supported)
   */
  private async performDropTypes(client: QueryClientContract) {
    if (!this.dropTypes) {
      return
    }

    if (!client.dialect.supportsTypes) {
      this.logger.warning(`Dropping types is not supported by "${client.dialect.name}"`)
    }

    await client.dropAllTypes()
    this.logger.success('Dropped types successfully')
  }

  /**
   * Run as a subcommand. Never close database connections or exit
   * process inside this method
   */
  private async runAsSubCommand() {
    const db = this.application.container.use('Adonis/Lucid/Database')
    this.connection = this.connection || db.primaryConnectionName
    const connection = db.connection(this.connection || db.primaryConnectionName)

    /**
     * Continue with clearing the database when not in production
     * or force flag is passed
     */
    let continueWipe = !this.application.inProduction || this.force
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
    if (!db.manager.has(this.connection)) {
      this.printNotAValidConnection(this.connection)
      this.exitCode = 1
      return
    }

    await this.performDropViews(connection)
    await this.performDropTables(connection)
    await this.performDropTypes(connection)
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
  public async run(): Promise<void> {
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
  public async completed() {
    if (this.isMain) {
      await this.application.container.use('Adonis/Lucid/Database').manager.closeAll(true)
    }
  }
}
