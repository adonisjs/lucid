/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import logUpdate from 'log-update'
import { inject } from '@adonisjs/fold'
import { BaseCommand, flags } from '@adonisjs/ace'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { MigratedFileNode } from '@ioc:Adonis/Lucid/Migrator'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * The command is meant to migrate the database by execute migrations
 * in `up` direction.
 */
@inject([null, 'Adonis/Lucid/Database'])
export default class Migrate extends BaseCommand {
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

  constructor (app: ApplicationContract, private _db: DatabaseContract) {
    super(app)
  }

  /**
   * Returns beautified log message string
   */
  private _getLogMessage (file: MigratedFileNode): string {
    const message = `${file.migration.name} ${this.colors.gray(`(batch: ${file.batch})`)}`

    if (file.status === 'pending') {
      return `${this.colors.yellow('pending')}   ${message}`
    }

    const lines: string[] = []

    if (file.status === 'completed') {
      lines.push(`${this.colors.green('completed')} ${message}`)
    } else {
      lines.push(`${this.colors.red('error')}     ${message}`)
    }

    if (file.queries.length) {
      lines.push(' START QUERIES')
      lines.push(' ================')
      file.queries.forEach((query) => lines.push(` ${query}`))
      lines.push(' ================')
      lines.push(' END QUERIES')
    }

    return lines.join('\n')
  }

  /**
   * Handle command
   */
  public async handle () {
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
     * A set of files processed and emitted using event emitter.
     */
    const processedFiles: Set<string> = new Set()

    /**
     * New up migrator
     */
    const { Migrator } = await import('../src/Migrator')
    const migrator = new Migrator(this._db, this.application, {
      direction: 'up',
      connectionName: this.connection,
      dryRun: this.dryRun,
    })

    /**
     * Starting to process a new migration file
     */
    migrator.on('migration:start', (file) => {
      processedFiles.add(file.migration.name)
      logUpdate(this._getLogMessage(file))
    })

    /**
     * Migration completed
     */
    migrator.on('migration:completed', (file) => {
      logUpdate(this._getLogMessage(file))
      logUpdate.done()
    })

    /**
     * Migration error
     */
    migrator.on('migration:error', (file) => {
      logUpdate(this._getLogMessage(file))
      logUpdate.done()
    })

    /**
     * Run and close db connection
     */
    await migrator.run()
    await migrator.close()

    /**
     * Log all pending files. This will happen, when one of the migration
     * fails with an error and then the migrator stops emitting events.
     */
    Object.keys(migrator.migratedFiles).forEach((file) => {
      if (!processedFiles.has(file)) {
        console.log(this._getLogMessage(migrator.migratedFiles[file]))
      }
    })

    /**
     * Log final status
     */
    switch (migrator.status) {
      case 'skipped':
        console.log(this.colors.cyan('Already upto date'))
        break
      case 'error':
        this.logger.fatal(migrator.error!)
        break
    }
  }
}
