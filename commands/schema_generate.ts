/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, flags } from '@adonisjs/core/ace'
import { type CommandOptions } from '@adonisjs/core/types/ace'
import { type OrmSchemaGenerator } from '../src/orm/schema_generator/generator.ts'
import { isAbsolute } from 'node:path'

export default class SchemaGenerate extends BaseCommand {
  static commandName = 'schema:generate'
  static description = 'Generate schema classes for all the tables in your database'
  static options: CommandOptions = {
    startApp: true,
  }

  declare private generator: OrmSchemaGenerator

  /**
   * Choose a custom pre-defined connection. Otherwise, we use the
   * default connection
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  declare connection: string

  /**
   * Display result in one compact single-line output
   */
  @flags.boolean({ description: 'A compact single-line output' })
  declare compactOutput: boolean

  /**
   * Not a valid connection
   */
  private printNotAValidConnection(connection: string) {
    this.logger.error(
      `"${connection}" is not a valid connection name. Double check "config/database" file`
    )
  }

  /**
   * Returns beautified log message string
   */
  protected printLogMessage(message: string) {
    const arrow = this.colors.gray('❯')
    this.logger.logUpdate(`${arrow} ${message}`)
  }

  /**
   * Run as a subcommand. Never close database connection or exit
   * process here
   */
  private async runAsSubCommand() {
    const db = await this.app.container.make('lucid.db')
    this.connection = this.connection || db.primaryConnectionName

    /**
     * Invalid database connection
     */
    const managerConnection = db.manager.get(this.connection)
    if (!managerConnection) {
      this.printNotAValidConnection(this.connection)
      this.exitCode = 1
      return
    }

    const outputPath =
      managerConnection.config.schemaGeneration?.outputPath ?? './database/schema.ts'

    let schemas: string[] = ['public']
    if ('searchPath' in managerConnection.config && managerConnection.config.searchPath) {
      schemas = managerConnection.config.searchPath
    }

    /**
     * Initiate schema generator
     */
    const { OrmSchemaGenerator } = await import('../src/orm/schema_generator/generator.js')
    this.generator = new OrmSchemaGenerator(db, this.app, {
      connectionName: this.connection,
      schemas,
      ...managerConnection.config.schemaGeneration,
      outputPath: isAbsolute(outputPath) ? outputPath : this.app.makePath(outputPath),
    })

    /**
     * Listen for progression events when compactOutput is not
     * enabled
     */
    if (!this.compactOutput) {
      this.generator.on('collect:tables', (tables) => {
        this.printLogMessage(
          `Scanned "${this.connection}" database and found ${tables.length} tables`
        )
      })
      this.generator.on('table:info', ({ tableName }) => {
        this.printLogMessage(`Scanned table ${tableName}`)
      })
      this.generator.on('generating:schema', () => {
        this.printLogMessage('Creating schema classes for scanned tables')
      })
    }

    try {
      const start = process.hrtime()
      await this.generator.generate()
      if (this.compactOutput) {
        this.logger.logUpdatePersist()
      }
      this.logger.success('Schema classes generated', { startTime: start })
    } catch (error) {
      this.logger.error('Unable to generate schema classes')
      this.error = error
      this.exitCode = 1
    }
  }

  /**
   * Branching out, so that if required we can implement
   * "runAsMain" separately from "runAsSubCommand".
   *
   * For now, they both are the same
   */
  private async runAsMain() {
    await this.runAsSubCommand()
  }

  /**
   * Handle command
   */
  async run(): Promise<void> {
    if (this.isMain) {
      await this.runAsMain()
    } else {
      await this.runAsSubCommand()
    }
  }

  /**
   * Lifecycle method invoked by ace after the "run"
   * method.
   */
  async completed() {
    if (this.generator && this.isMain) {
      await this.generator.close()
    }
  }
}
