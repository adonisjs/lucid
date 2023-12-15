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

export default class DbTruncate extends BaseCommand {
  static commandName = 'db:truncate'
  static description = 'Truncate all tables in database'
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
   * Prompts to take consent when truncating the database in production
   */
  private async takeProductionConstent(): Promise<boolean> {
    const question = 'You are in production environment. Want to continue truncating the database?'
    try {
      return await this.prompt.confirm(question)
    } catch (error) {
      return false
    }
  }

  /**
   * Truncate all tables except adonis migrations table
   */
  private async performTruncate(client: QueryClientContract, schemas: string[]) {
    let tables = await client.getAllTables(schemas)
    tables = tables.filter((table) => !['adonis_schema', 'adonis_schema_versions'].includes(table))

    await Promise.all(tables.map((table) => client.truncate(table, true)))
    this.logger.success('Truncated tables successfully')
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
    let continueTruncate = !this.app.inProduction || this.force
    if (!continueTruncate) {
      continueTruncate = await this.takeProductionConstent()
    }

    /**
     * Do not continue when in prod and the prompt was cancelled
     */
    if (!continueTruncate) {
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

    await this.performTruncate(connection, schemas)
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
