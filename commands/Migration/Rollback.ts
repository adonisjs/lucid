/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { flags } from '@adonisjs/core/build/standalone'
import { MigratorContract } from '@ioc:Adonis/Lucid/Migrator'

import MigrationsBase from './Base'

/**
 * The command is meant to migrate the database by executing migrations
 * in `down` direction.
 */
export default class Migrate extends MigrationsBase {
  public static commandName = 'migration:rollback'
  public static description = 'Rollback migrations to a specific batch number'
  public static settings = {
    loadApp: true,
  }

  private migrator: MigratorContract

  /**
   * Custom connection for running migrations.
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  public connection: string

  /**
   * Force run migrations in production
   */
  @flags.boolean({ description: 'Explictly force to run migrations in production' })
  public force: boolean

  /**
   * Perform dry run
   */
  @flags.boolean({ description: 'Do not run actual queries. Instead view the SQL output' })
  public dryRun: boolean

  /**
   * Define custom batch, instead of rolling back to the latest batch
   */
  @flags.number({
    description: 'Define custom batch number for rollback. Use 0 to rollback to initial state',
  })
  public batch: number

  /**
   * Display migrations result in one compact single-line output
   */
  @flags.boolean({ description: 'A compact single-line output' })
  public compactOutput: boolean = false

  /**
   * Instantiating the migrator instance
   */
  private instantiateMigrator() {
    const db = this.application.container.use('Adonis/Lucid/Database')
    const Migrator = this.application.container.resolveBinding('Adonis/Lucid/Migrator')

    this.migrator = new Migrator(db, this.application, {
      direction: 'down',
      connectionName: this.connection,
      batch: this.batch,
      dryRun: this.dryRun,
    })
  }

  /**
   * Run as a subcommand. Never close database connections or exit
   * process inside this method
   */
  private async runAsSubCommand() {
    const db = this.application.container.use('Adonis/Lucid/Database')
    this.connection = this.connection || db.primaryConnectionName

    /**
     * Continue with migrations when not in prod or force flag
     * is passed
     */
    let continueMigrations = !this.application.inProduction || this.force
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

    this.instantiateMigrator()
    await this.runMigrations(this.migrator, this.connection)
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
    if (this.migrator && this.isMain) {
      await this.migrator.close()
    }
  }
}
