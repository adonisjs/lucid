/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { flags } from '@adonisjs/core/ace'

import MigrationsBase from './_base.js'
import { MigrationRunner } from '../../src/migration/runner.js'
import { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * The command is meant to migrate the database by executing migrations
 * in `down` direction.
 */
export default class Migrate extends MigrationsBase {
  static commandName = 'migration:rollback'
  static description = 'Rollback migrations to a specific batch number'
  static options: CommandOptions = {
    startApp: true,
  }

  private migrator?: MigrationRunner

  /**
   * Custom connection for running migrations.
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  declare connection: string

  /**
   * Force run migrations in production
   */
  @flags.boolean({ description: 'Explictly force to run migrations in production' })
  declare force: boolean

  /**
   * Perform dry run
   */
  @flags.boolean({ description: 'Do not run actual queries. Instead view the SQL output' })
  declare dryRun: boolean

  /**
   * Define custom batch, instead of rolling back to the latest batch
   */
  @flags.number({
    description: 'Define custom batch number for rollback. Use 0 to rollback to initial state',
  })
  declare batch: number

  /**
   * Display migrations result in one compact single-line output
   */
  @flags.boolean({ description: 'A compact single-line output' })
  declare compactOutput: boolean

  /**
   * Disable advisory locks
   */
  @flags.boolean({ description: 'Disable locks acquired to run migrations safely' })
  declare disableLocks: boolean

  /**
   * Instantiating the migrator instance
   */
  private async instantiateMigrator() {
    const db = await this.app.container.make('lucid.db')

    this.migrator = new MigrationRunner(db, this.app, {
      direction: 'down',
      connectionName: this.connection,
      batch: this.batch,
      dryRun: this.dryRun,
      disableLocks: this.disableLocks,
    })
  }

  /**
   * Run as a subcommand. Never close database connections or exit
   * process inside this method
   */
  private async runAsSubCommand() {
    const db = await this.app.container.make('lucid.db')
    this.connection = this.connection || db.primaryConnectionName

    /**
     * Continue with migrations when not in prod or force flag
     * is passed
     */
    let continueMigrations = !this.app.inProduction || this.force
    if (!continueMigrations) {
      continueMigrations = await this.takeProductionConstent()
    }

    /**
     * Do not continue when in prod and the prompt was cancelled
     */
    if (!continueMigrations) {
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

    await this.instantiateMigrator()
    await this.runMigrations(this.migrator!, this.connection)
  }

  /**
   * Branching out, so that if required we can implement
   * "runAsMain" separately from "runAsSubCommand".
   *
   * For now, they both are the same
   */
  private runAsMain() {
    return this.runAsSubCommand()
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
    if (this.migrator && this.isMain) {
      await this.migrator.close()
    }
  }
}
