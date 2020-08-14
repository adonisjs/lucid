/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { inject } from '@adonisjs/fold'
import { SeederFileNode } from '@ioc:Adonis/Lucid/Seeder'
import { BaseCommand, Kernel, flags } from '@adonisjs/ace'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

@inject([null, null, 'Adonis/Lucid/Database'])
export default class DbSeed extends BaseCommand {
	public static commandName = 'db:seed'
	public static description = 'Execute database seeder files'

	/**
	 * Choose a custom pre-defined connection. Otherwise, we use the
	 * default connection
	 */
	@flags.string({ description: 'Define a custom database connection for the seeders', alias: 'c' })
	public connection: string

	/**
	 * Interactive mode allows selecting seeder files
	 */
	@flags.boolean({ description: 'Run seeders in interactive mode', alias: 'i' })
	public interactive: boolean

	/**
	 * Define a custom set of seeder files. Interactive and files together ignores
	 * the interactive mode.
	 */
	@flags.array({ description: 'Define a custom set of seeders files names to run', alias: 'f' })
	public files: string[]

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
	 * Print log message to the console
	 */
	private printLogMessage(file: SeederFileNode) {
		const colors = this['colors']

		let color: keyof typeof colors = 'gray'
		let message: string = ''
		let prefix: string = ''

		switch (file.status) {
			case 'pending':
				message = 'pending  '
				color = 'gray'
				break
			case 'failed':
				message = 'error    '
				prefix = file.error!.message
				color = 'red'
				break
			case 'ignored':
				message = 'ignored  '
				prefix = 'Enabled only in development environment'
				color = 'dim'
				break
			case 'completed':
				message = 'completed'
				color = 'green'
				break
		}

		console.log(`${colors[color]('❯')} ${colors[color](message)} ${file.name}`)
		if (prefix) {
			console.log(`  ${colors[color](prefix)}`)
		}
	}

	/**
	 * Execute command
	 */
	public async handle(): Promise<void> {
		this.connection = this.connection || this.db.primaryConnectionName
		const connection = this.db.getRawConnection(this.connection)

		/**
		 * Ensure the define connection name does exists in the
		 * config file
		 */
		if (!connection) {
			this.logger.error(
				`"${connection}" is not a valid connection name. Double check config/database file`
			)
			return
		}

		const { SeedsRunner } = await import('../src/SeedsRunner')
		const runner = new SeedsRunner(this.db, this.application, this.connection)

		/**
		 * List of available files
		 */
		const files = await runner.getList()

		/**
		 * List of selected files. Initially, all files are selected and one can
		 * define cherry pick using the `--interactive` or `--files` flag.
		 */
		let selectedFileNames: string[] = files.map(({ name }) => name)

		if (this.files.length) {
			selectedFileNames = this.files
			if (this.interactive) {
				this.logger.warn(
					'Cannot use "--interactive" and "--files" together. Ignoring "--interactive"'
				)
			}
		} else if (this.interactive) {
			selectedFileNames = await this.prompt.multiple(
				'Select files to run',
				files.map((file) => {
					return { name: file.name }
				})
			)
		}

		/**
		 * Execute selected seeders
		 */
		for (let fileName of selectedFileNames) {
			const sourceFile = files.find(({ name }) => fileName === name)
			if (!sourceFile) {
				this.printLogMessage({
					file: {
						name: fileName,
						absPath: fileName,
						getSource: () => {},
					},
					status: 'failed',
					error: new Error('Invalid file path. Pass relative path from the application root'),
				})
			} else {
				const response = await runner.run(sourceFile)
				this.printLogMessage(response)
			}
		}

		await this.db.manager.closeAll(true)
	}
}
