/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, flags } from '@adonisjs/core/ace'
import { type CommandOptions } from '@adonisjs/core/types/ace'
import { SchemaDumper } from '../src/migration/schema_dumper.js'

/**
 * Dump the current database schema to a SQL file. The dump also embeds the
 * migrations bookkeeping tables, so that future runs can bootstrap from the
 * SQL snapshot and treat older migrations as already executed.
 */
export default class SchemaDump extends BaseCommand {
  static commandName = 'schema:dump'
  static description = 'Dump the database schema to a SQL file'
  static options: CommandOptions = {
    startApp: true,
  }

  /**
   * Custom connection for dumping the schema.
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  declare connection: string

  /**
   * Custom path for storing the generated SQL dump.
   */
  @flags.string({ description: 'Define a custom path for the schema dump' })
  declare path: string

  /**
   * Delete all migration files after creating the dump.
   */
  @flags.boolean({ description: 'Delete all migration files from configured migration paths' })
  declare prune: boolean

  private dumper?: SchemaDumper

  /**
   * Handle command execution
   */
  async run() {
    const db = await this.app.container.make('lucid.db')
    this.connection = this.connection || db.primaryConnectionName

    if (!db.manager.get(this.connection)) {
      this.logger.error(
        `"${this.connection}" is not a valid connection name. Double check "config/database" file`
      )
      this.exitCode = 1
      return
    }

    this.dumper = new SchemaDumper(db, this.app, {
      connectionName: this.connection,
      outputPath: this.path,
      prune: this.prune,
    })

    await this.dumper.run()

    if (this.dumper.error) {
      this.exitCode = 1
      this.logger.error('Unable to dump database schema')
      this.logger.error(this.dumper.error)
      return
    }

    const result = this.dumper.result!
    this.logger.success(
      result.pruned
        ? `Database schema dumped to "${result.dumpLabel}" and migration files pruned`
        : `Database schema dumped to "${result.dumpLabel}"`
    )
    this.logger.success(`Schema manifest written to "${result.metaLabel}"`)
  }

  /**
   * Close database connections only when executed as the main command
   */
  async completed() {
    if (this.dumper && this.isMain) {
      await this.dumper.close()
    }
  }
}
