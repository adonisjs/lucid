/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { flags } from '@adonisjs/core/build/standalone'
import { promisify } from 'util'
import { execFile as childProcessExec } from 'child_process'
import MigrationsBase from './Base'

const exec = promisify(childProcessExec)

/**
 * The command is meant to migrate the database by executing migrations
 * in `down` and `up` directions.
 */
export default class Migrate extends MigrationsBase {
  public static commandName = 'migration:fresh'
  public static description = 'Reset migrations to initial state and run all migrations again'

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
  @flags.boolean({ description: 'Print SQL queries, instead of running the migrations' })
  public dryRun: boolean

  /**
   * This command loads the application, since we need the runtime
   * to find the migration directories for a given connection
   */
  public static settings = {
    loadApp: true,
  }

  /**
   * Executes a given command
   */
  private async execCommand(command: string, commandArgs: string[]) {
    const { stdout, stderr } = await exec(command, commandArgs, {
      env: {
        ...process.env,
        FORCE_COLOR: 'true',
      },
    })

    if (stdout) {
      console.log(stdout.trim())
    }

    if (stderr) {
      console.log(stderr.trim())
      throw new Error(`Command "${command}" failed`)
    }
  }

  /**
   * Returns a arguments array with current values
   */
  private argsWithCurrentValues(): string[] {
    let args: string[] = []
    this.connection && args.push(`--connection=${this.connection}`)
    this.force && args.push(`--force`)
    this.dryRun && args.push(`--dry-run`)
    return args
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
     * Execute migration:reset and migration:run commands
     * with current arguments
     */
    await this.execCommand('node', ['ace', 'migration:reset', ...this.argsWithCurrentValues()])
    await this.execCommand('node', ['ace', 'migration:run', ...this.argsWithCurrentValues()])
  }
}
