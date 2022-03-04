/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { flags, BaseCommand } from '@adonisjs/core/build/standalone'

/**
 * This command reset the database by rolling back to batch 0 and then
 * re-run all migrations.
 */
export default class Refresh extends BaseCommand {
  public static commandName = 'migration:fresh'
  public static description = 'Drop all tables and re-migrate the database'
  public static settings = {
    loadApp: true,
  }

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
   * Run seeders
   */
  @flags.boolean({ description: 'Run seeders' })
  public seed: boolean

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
   * Converting command properties to arguments
   */
  private getArgs() {
    const args: string[] = []
    if (this.force) {
      args.push('--force')
    }

    if (this.connection) {
      args.push(`--connection="${this.connection}"`)
    }

    return args
  }

  /**
   * Converting command properties to db:wipe arguments
   */
  private getWipeArgs() {
    const args: string[] = this.getArgs()
    if (this.dropTypes) {
      args.push('--drop-types')
    }

    if (this.dropViews) {
      args.push('--drop-views')
    }

    return args
  }

  /**
   * Wipe the database
   */
  private async runDbWipe() {
    const dbWipe = await this.kernel.exec('db:wipe', this.getWipeArgs())
    this.exitCode = dbWipe.exitCode
    this.error = dbWipe.error
  }

  /**
   * Run migrations
   */
  private async runMigrations() {
    const migrate = await this.kernel.exec('migration:run', this.getArgs())
    this.exitCode = migrate.exitCode
    this.error = migrate.error
  }

  /**
   * Run seeders
   */
  private async runDbSeed() {
    const args: string[] = []
    if (this.connection) {
      args.push(`--connection="${this.connection}"`)
    }

    const dbSeed = await this.kernel.exec('db:seed', args)
    this.exitCode = dbSeed.exitCode
    this.error = dbSeed.error
  }

  /**
   * Handle command
   */
  public async run(): Promise<void> {
    await this.runDbWipe()
    if (this.exitCode) {
      return
    }

    await this.runMigrations()
    if (this.exitCode) {
      return
    }

    if (this.seed) {
      await this.runDbSeed()
    }
  }
}
