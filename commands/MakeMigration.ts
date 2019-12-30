/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { join } from 'path'
import camelCase from 'camelcase'
import { snakeCase } from 'snake-case'
import { inject } from '@adonisjs/fold'
import { BaseCommand, Kernel, args, flags } from '@adonisjs/ace'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

@inject([null, 'Adonis/Lucid/Database'])
export default class MakeMigration extends BaseCommand {
  public static commandName = 'make:migration'
  public static description = 'Make a new migration file'

  /**
   * The name of the migration file. We use this to create the migration
   * file and generate the table name
   */
  @args.string({ description: 'Name of the migration file' })
  public name: string

  /**
   * Choose a custom pre-defined connection. Otherwise, we use the
   * default connection
   */
  @flags.string({ description: 'Define a custom database connection for the migration' })
  public connection: string

  /**
   * Pre select migration directory. If this is defined, we will ignore the paths
   * defined inside the config.
   */
  @flags.string({ description: 'Pre-select a migration directory' })
  public folder: string

  /**
   * Custom table name for creating a new table
   */
  @flags.string({ description: 'Define the table name for creating a new table' })
  public create: string

  /**
   * Custom table name for altering an existing table
   */
  @flags.string({ description: 'Define the table name for altering an existing table' })
  public table: string

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
   * Returns the directory for creating the migration file
   */
  private async _getDirectory (migrationPaths?: string[]): Promise<string> {
    if (this.folder) {
      return this.folder
    }

    let directories = migrationPaths && migrationPaths.length ? migrationPaths : ['database/migrations']
    if (directories.length === 1) {
      return directories[0]
    }

    return this.prompt.choice('Select the migrations folder', directories, { name: 'folder' })
  }

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
     * Not allowed together, hence we must notify the user about the same
     */
    if (this.table && this.create) {
      this.logger.warn('--table and --create cannot be used together. Ignoring --create')
    }

    /**
     * The folder for creating the schema file
     */
    const folder = await this._getDirectory((connection.config.migrations || {}).paths)

    /**
     * Using the user defined table name or an empty string. We can attempt to
     * build the table name from the migration file name, but let's do that
     * later.
     */
    const tableName = this.table || this.create || ''

    /**
     * Template stub
     */
    const stub = join(
      __dirname,
      '..',
      'templates',
      this.table ? 'migration-alter.txt' : 'migration-make.txt',
    )

    /**
     * Prepend timestamp to keep schema files in the order they
     * have been created
     */
    const prefix = `${new Date().getTime()}_`

    this
      .generator
      .addFile(this.name, { pattern: 'snakecase', form: 'plural', prefix })
      .stub(stub)
      .destinationDir(folder)
      .appRoot(this.application.cliCwd || this.application.appRoot)
      .apply({
        toClassName (filename: string) {
          return camelCase(tableName || filename.replace(prefix, ''), { pascalCase: true })
        },
        toTableName (filename: string) {
          return tableName || snakeCase(filename.replace(prefix, ''))
        },
      })

    await this.generator.run()
  }
}
