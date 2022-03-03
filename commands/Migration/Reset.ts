/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { flags } from '@adonisjs/core/build/standalone'

import MigrationsBase from './Base'

/**
 * This command reset the database by rolling back to batch 0
 */
export default class Reset extends MigrationsBase {
  public static commandName = 'migration:reset'
  public static description = 'Reset migrations to initial state'

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

    /**
     * New down migrator
     */
    const { Migrator } = await import('../../src/Migrator')
    const migrator = new Migrator(db, this.application, {
      direction: 'down',
      batch: 0,
      connectionName: this.connection,
      dryRun: this.dryRun,
    })

    await this.runMigrations(migrator, this.connection)
  }
}
