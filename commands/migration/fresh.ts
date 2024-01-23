/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { flags, BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * This command reset the database by rolling back to batch 0 and then
 * re-run all migrations.
 */
export default class Refresh extends BaseCommand {
  static commandName = 'migration:fresh'
  static description = 'Drop all tables and re-migrate the database'
  static options: CommandOptions = {
    startApp: true,
  }

  /**
   * Custom connection for running migrations.
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  declare connection: string

  /**
   * Force command execution in production
   */
  @flags.boolean({ description: 'Explicitly force command to run in production' })
  declare force: boolean

  /**
   * Run seeders
   */
  @flags.boolean({ description: 'Run seeders' })
  declare seed: boolean

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
   * Drop all domains in database
   */
  @flags.boolean({ description: 'Drop all domains (Postgres only)' })
  declare dropDomains: boolean

  /**
   * Disable advisory locks
   */
  @flags.boolean({ description: 'Disable locks acquired to run migrations safely' })
  declare disableLocks: boolean

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

    if (this.disableLocks) {
      args.push('--disable-locks')
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

    if (this.dropDomains) {
      args.push('--drop-domains')
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
  async run(): Promise<void> {
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
