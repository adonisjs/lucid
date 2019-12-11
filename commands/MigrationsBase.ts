/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import logUpdate from 'log-update'
import { BaseCommand } from '@adonisjs/ace'
import { MigratedFileNode, MigratorContract } from '@ioc:Adonis/Lucid/Migrator'

/**
 * Base class to execute migrations and print logs
 */
export default abstract class MigrationsBase extends BaseCommand {
  /**
   * Returns beautified log message string
   */
  protected $getLogMessage (file: MigratedFileNode): string {
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
   * Runs the migrations using the migrator
   */
  protected async $runMigrations (migrator: MigratorContract): Promise<void> {
    /**
     * A set of files processed and emitted using event emitter.
     */
    const processedFiles: Set<string> = new Set()

    /**
     * Starting to process a new migration file
     */
    migrator.on('migration:start', (file) => {
      processedFiles.add(file.migration.name)
      logUpdate(this.$getLogMessage(file))
    })

    /**
     * Migration completed
     */
    migrator.on('migration:completed', (file) => {
      logUpdate(this.$getLogMessage(file))
      logUpdate.done()
    })

    /**
     * Migration error
     */
    migrator.on('migration:error', (file) => {
      logUpdate(this.$getLogMessage(file))
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
        console.log(this.$getLogMessage(migrator.migratedFiles[file]))
      }
    })

    /**
     * Log final status
     */
    switch (migrator.status) {
      case 'skipped':
        const message = migrator.direction === 'up' ? 'Already upto date' : 'Already at latest batch'
        console.log(this.colors.cyan(message))
        break
      case 'error':
        this.logger.fatal(migrator.error!)
        break
    }
  }
}
