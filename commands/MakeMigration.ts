/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import { string } from '@poppinss/utils/build/helpers'
import { BaseCommand, args, flags } from '@adonisjs/core/build/standalone'

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

	/**
	 * Returns the directory for creating the migration file
	 */
	private async getDirectory(migrationPaths?: string[]): Promise<string> {
		if (this.folder) {
			return this.folder
		}

		let directories =
			migrationPaths && migrationPaths.length ? migrationPaths : ['database/migrations']
		if (directories.length === 1) {
			return directories[0]
		}

		return this.prompt.choice('Select the migrations folder', directories, { name: 'folder' })
	}

	/**
	 * Execute command
	 */
	public async run(): Promise<void> {
		const db = this.application.container.use('Adonis/Lucid/Database')
		const connection = db.getRawConnection(this.connection || db.primaryConnectionName)

		/**
		 * Ensure the define connection name does exists in the
		 * config file
		 */
		if (!connection) {
			this.logger.error(
				`${this.connection} is not a valid connection name. Double check config/database file`
			)
			return
		}

		/**
		 * Not allowed together, hence we must notify the user about the same
		 */
		if (this.table && this.create) {
			this.logger.warning('--table and --create cannot be used together. Ignoring --create')
		}

		/**
		 * The folder for creating the schema file
		 */
		const folder = await this.getDirectory((connection.config.migrations || {}).paths)

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
			this.table ? 'migration-alter.txt' : 'migration-make.txt'
		)

		/**
		 * Prepend timestamp to keep schema files in the order they
		 * have been created
		 */
		const prefix = `${new Date().getTime()}_`

		this.generator
			.addFile(this.name, { pattern: 'snakecase', form: 'plural', prefix })
			.stub(stub)
			.destinationDir(folder)
			.appRoot(this.application.cliCwd || this.application.appRoot)
			.useMustache()
			.apply({
				toClassName() {
					return function (filename: string, render: (text: string) => string) {
						const migrationClassName = string.camelCase(
							tableName || render(filename).replace(prefix, '')
						)
						return `${migrationClassName.charAt(0).toUpperCase()}${migrationClassName.slice(1)}`
					}
				},
				toTableName() {
					return function (filename: string, render: (text: string) => string) {
						return tableName || string.snakeCase(render(filename).replace(prefix, ''))
					}
				},
			})

		await this.generator.run()
	}
}
