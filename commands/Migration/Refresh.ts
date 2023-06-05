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
  public static commandName = 'migration:refresh'
  public static description = 'Rollback and migrate database'
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
   * Perform dry run
   */
  @flags.boolean({ description: 'Do not run actual queries. Instead view the SQL output' })
  public dryRun: boolean

  /**
   * Run seeders
   */
  @flags.boolean({ description: 'Run seeders' })
  public seed: boolean

  /**
   * Disable advisory locks
   */
  @flags.boolean({ description: 'Disable locks acquired to run migrations safely' })
  public disableLocks: boolean

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

    if (this.dryRun) {
      args.push('--dry-run')
    }

    if (this.disableLocks) {
      args.push('--disable-locks')
    }

    return args
  }

  /**
   * Reset all migrations
   */
  private async resetMigrations() {
    const reset = await this.kernel.exec('migration:reset', this.getArgs())
    this.exitCode = reset.exitCode
    this.error = reset.error
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
    await this.resetMigrations()
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
