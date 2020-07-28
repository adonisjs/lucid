/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import CliTable from 'cli-table3'
import { inject } from '@adonisjs/fold'
import { flags, Kernel } from '@adonisjs/ace'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { MigrationListNode } from '@ioc:Adonis/Lucid/Migrator'
import MigrationsBase from './Base'

/**
 * The command is meant to migrate the database by execute migrations
 * in `up` direction.
 */
@inject([null, null, 'Adonis/Lucid/Database'])
export default class Status extends MigrationsBase {
	public static commandName = 'migration:status'
	public static description = 'Check migrations current status.'

	/**
	 * Define custom connection
	 */
	@flags.string({ description: 'Define a custom database connection' })
	public connection: string

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
	 * Colorizes the status string
	 */
	private colorizeStatus(status: MigrationListNode['status']): string {
		switch (status) {
			case 'pending':
				return this.colors.yellow('pending')
			case 'migrated':
				return this.colors.green('completed')
			case 'corrupt':
				return this.colors.red('corrupt')
		}
	}

	/**
	 * Handle command
	 */
	public async handle(): Promise<void> {
		this.connection = this.connection || this.db.primaryConnectionName
		const connection = this.db.getRawConnection(this.connection)

		/**
		 * Ensure the define connection name does exists in the
		 * config file
		 */
		if (!connection) {
			this.printNotAValidConnection(this.connection)
			return
		}

		const { Migrator } = await import('../../src/Migrator')
		const migrator = new Migrator(this.db, this.application, {
			direction: 'up',
			connectionName: this.connection,
		})

		const list = await migrator.getList()
		await migrator.close()

		this.printPreviewMessage()
		const table = new CliTable({
			head: ['Name', 'Status', 'Batch', 'Message'],
		})

		/**
		 * Push a new row to the table
		 */
		list.forEach((node) => {
			table.push([
				node.name,
				this.colorizeStatus(node.status),
				node.batch || 'NA',
				node.status === 'corrupt' ? 'The migration file is missing on filesystem' : '',
			] as any)
		})

		console.log(table.toString())
	}
}
