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
@inject([null, 'Adonis/Lucid/Database'])
export default class Migrate extends MigrationsBase {
  public static commandName = 'migration:run'
  public static description = 'Run pending migrations'

  @flags.string({ description: 'Define a custom database connection' })
  public connection: string

  @flags.boolean({ description: 'Print SQL queries, instead of running the migrations' })
  public dryRun: boolean

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
     * New up migrator
     */
    const { Migrator } = await import('../src/Migrator')
    const migrator = new Migrator(this._db, this.application, {
      direction: 'up',
      connectionName: this.connection,
      dryRun: this.dryRun,
    })

    await this.$runMigrations(migrator)
  }
}
