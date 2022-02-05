import { flags } from '@adonisjs/core/build/standalone'
import DbSeed from '../DbSeed'
import DbWipe from '../DbWipe'
import MigrationsBase from './Base'
import Run from './Run'

/**
 * This command reset the database by rolling back to batch 0 and then
 * re-run all migrations.
 */
export default class Refresh extends MigrationsBase {
  public static commandName = 'migration:fresh'
  public static description = 'Drop all tables and re-run all migrations.'

  /**
   * Custom connection for running migrations.
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  public connection: string

  /**
   * Force command execution in production
   */
  @flags.boolean({ description: 'Explicitly force command to run in production' })
  public force: boolean

  /**
   * Perform dry run
   */
  @flags.boolean({ description: 'Only print SQL queries instead of executing them' })
  public dryRun: boolean

  /**
   * Run seeders
   */
  @flags.boolean({ description: 'Indicates if the seed task should run.' })
  public seed: boolean

  /**
   * This command loads the application, since we need the runtime
   * to find the migration directories for a given connection
   */
  public static settings = {
    loadApp: true,
  }

  /**
   * Handle command
   */
  public async run(): Promise<void> {
    const db = this.application.container.use('Adonis/Lucid/Database')
    this.connection = this.connection || db.primaryConnectionName

    const continueMigrations =
      !this.application.inProduction || this.force || (await this.takeProductionConstent())

    /**
     * Prompt cancelled or rejected and hence do not continue
     */
    if (!continueMigrations) {
      return
    }

    const connection = db.getRawConnection(this.connection)

    /**
     * Ensure the define connection name does exists in the
     * config file
     */
    if (!connection) {
      this.printNotAValidConnection(this.connection)
      this.exitCode = 1
      return
    }

    await this.runDbWipe()
    await this.runMigrationRun()

    if (this.seed) {
      await this.runSeeders()
    }

    /**
     * Close the connection after the migrations since we gave
     * the order to not close after previous Migrator operations
     */
    db.manager.closeAll(true)
  }

  /**
   * Run the db:wipe command
   */
  public async runDbWipe(): Promise<void> {
    const resetCmd = new DbWipe(this.application, this.kernel)
    resetCmd.connection = this.connection
    resetCmd.force = true

    await resetCmd.run()
  }

  /**
   * Run the migration:run command
   */
  public async runMigrationRun(): Promise<void> {
    const migrateRunCmd = new Run(this.application, this.kernel)
    migrateRunCmd.connection = this.connection
    migrateRunCmd.force = true
    migrateRunCmd.dryRun = this.dryRun
    migrateRunCmd.shouldCloseConnectionAfterMigrations = false

    await migrateRunCmd.run()
  }

  /**
   * Run the seeders
   */
  public async runSeeders(): Promise<void> {
    const seedCmd = new DbSeed(this.application, this.kernel)
    seedCmd.connection = this.connection

    await seedCmd.run()
  }
}
