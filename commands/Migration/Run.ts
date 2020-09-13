/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { inject } from '@adonisjs/fold'
import { flags, Kernel } from '@adonisjs/ace'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import MigrationsBase from './Base'

/**
 * The command is meant to migrate the database by execute migrations
 * in `up` direction.
 */
@inject([null, null, 'Adonis/Lucid/Database'])
export default class Migrate extends MigrationsBase {
	public static commandName = 'migration:run'
	public static description = 'Run pending migrations'

	/**
	 * Custom connection for running migrations.
	 */
	@flags.string({ description: 'Define a custom database connection', alias: 'c' })
	public connection: string

	/**
	 * Force run migrations in production
	 */
	@flags.boolean({ description: 'Explicitly force to run migrations in production' })
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

	constructor(app: ApplicationContract, kernel: Kernel, private db: DatabaseContract) {
		super(app, kernel)
	}

	/**
	 * Handle command
	 */
	public async handle(): Promise<void> {
		this.connection = this.connection || this.db.primaryConnectionName
		const continueMigrations =
			!this.application.inProduction || this.force || (await this.takeProductionConstent())

		/**
		 * Prompt cancelled or rejected and hence do not continue
		 */
		if (!continueMigrations) {
			return
		}

		const connection = this.db.getRawConnection(this.connection)

		/**
		 * Ensure the define connection name does exists in the
		 * config file
		 */
		if (!connection) {
			this.printNotAValidConnection(this.connection)
			return
		}

		/**
		 * New up migrator
		 */
		const { Migrator } = await import('../../src/Migrator')
		const migrator = new Migrator(this.db, this.application, {
			direction: 'up',
			connectionName: this.connection,
			dryRun: this.dryRun,
		})

		this.printPreviewMessage()
		await this.runMigrations(migrator, this.connection)
	}
}
