/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { inject } from '@adonisjs/fold'
import { flags, Kernel } from '@adonisjs/ace'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import MigrationsBase from './MigrationsBase'

/**
 * The command is meant to migrate the database by execute migrations
 * in `up` direction.
 */
@inject([null, null, 'Adonis/Lucid/Database'])
export default class Migrate extends MigrationsBase {
  public static commandName = 'migration:rollback'
  public static description = 'Rollback migrations to a given batch number'

  @flags.string({ description: 'Define a custom database connection' })
  public connection: string

  @flags.boolean({ description: 'Print SQL queries, instead of running the migrations' })
  public dryRun: boolean

  @flags.boolean({ description: 'Explictly force to run migrations in production' })
  public force: boolean

  @flags.number({
    description: 'Define custom batch number for rollback. Use 0 to rollback to initial state',
  })
  public batch: number

  /**
   * This command loads the application, since we need the runtime
   * to find the migration directories for a given connection
   */
  public static settings = {
    loadApp: true,
  }

  constructor (app: ApplicationContract, kernel: Kernel, private _db: DatabaseContract) {
    super(app, kernel)
  }

  /**
   * Handle command
   */
  public async handle (): Promise<void> {
    const connection = this._db.getRawConnection(this.connection || this._db.primaryConnectionName)
    let continueMigrations = !this.application.inProduction || this.force

    /**
     * Ensure the define connection name does exists in the
     * config file
     */
    if (!connection) {
      this.logger.error(
        `${this.connection} is not a valid connection name. Double check config/database file`,
      )
      return
    }

    /**
     * Ask for prompt when running in production and `force` flag is
     * not defined
     */
    if (!continueMigrations) {
      try {
        continueMigrations = await this.prompt
          .confirm('You are in production environment. Want to continue running migrations?')
      } catch (error) {
        continueMigrations = false
      }
    }

    /**
     * Prompt cancelled or rejected and hence do not continue
     */
    if (!continueMigrations) {
      return
    }

    /**
     * New up migrator
     */
    const { Migrator } = await import('../src/Migrator')
    const migrator = new Migrator(this._db, this.application, {
      direction: 'down',
      batch: this.batch,
      connectionName: this.connection,
      dryRun: this.dryRun,
    })

    this.printPreviewMessage()
    await this.$runMigrations(migrator)
  }
}
