/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import prettyHrTime from 'pretty-hrtime'
import { BaseCommand } from '@adonisjs/core/build/standalone'
import { MigratedFileNode, MigratorContract } from '@ioc:Adonis/Lucid/Migrator'

import { prettyPrint } from '../../src/Helpers/prettyPrint'
import { getDDLMethod } from '../../src/utils'

/**
 * Base class to execute migrations and print logs
 */
export default abstract class MigrationsBase extends BaseCommand {
	/**
	 * Not a valid message
	 */
	protected printNotAValidConnection(connection: string) {
		this.logger.error(
			`"${connection}" is not a valid connection name. Double check config/database file`
		)
	}

	/**
	 * Prompts to take consent for running migrations in production
	 */
	protected async takeProductionConstent(): Promise<boolean> {
		const question = 'You are in production environment. Want to continue running migrations?'
		try {
			const continueMigrations = await this.prompt.confirm(question)
			return continueMigrations
		} catch (error) {
			return false
		}
	}

	/**
	 * Returns beautified log message string
	 */
	protected printLogMessage(file: MigratedFileNode, direction: 'down' | 'up') {
		const color = file.status === 'pending' ? 'gray' : file.status === 'completed' ? 'green' : 'red'
		const arrow = this.colors[color]('❯')
		const message =
			file.status === 'pending'
				? direction === 'up'
					? 'migrating'
					: 'reverting'
				: file.status === 'completed'
				? direction === 'up'
					? 'migrated'
					: 'reverted'
				: 'error'

		this.logger.logUpdate(`${arrow} ${this.colors[color](message)} ${file.file.name}`)
	}

	/**
	 * Pretty print sql queries of a file
	 */
	private prettyPrintSql(file: MigratedFileNode, connectionName: string) {
		console.log(this.logger.colors.gray(`------------- ${file.file.name} -------------`))
		console.log()
		file.queries.map((sql) => {
			prettyPrint({
				connection: connectionName,
				sql: sql,
				ddl: true,
				method: getDDLMethod(sql),
				bindings: [],
			})
			console.log()
		})
		console.log(this.logger.colors.gray('------------- END -------------'))
	}

	/**
	 * Runs the migrations using the migrator
	 */
	protected async runMigrations(migrator: MigratorContract, connectionName: string): Promise<void> {
		/**
		 * Pretty print SQL in dry run and return early
		 */
		if (migrator.dryRun) {
			await migrator.run()
			await migrator.close()

			Object.keys(migrator.migratedFiles).forEach((file) => {
				this.prettyPrintSql(migrator.migratedFiles[file], connectionName)
			})

			return
		}

		/**
		 * A set of files processed and emitted using event emitter.
		 */
		const processedFiles: Set<string> = new Set()
		let start: [number, number] | undefined
		let duration: [number, number] | undefined

		/**
		 * Starting to process a new migration file
		 */
		migrator.on('migration:start', (file) => {
			processedFiles.add(file.file.name)
			this.printLogMessage(file, migrator.direction)
		})

		/**
		 * Migration completed
		 */
		migrator.on('migration:completed', (file) => {
			this.printLogMessage(file, migrator.direction)
			this.logger.logUpdatePersist()
		})

		/**
		 * Migration error
		 */
		migrator.on('migration:error', (file) => {
			this.printLogMessage(file, migrator.direction)
			this.logger.logUpdatePersist()
		})

		migrator.on('start', () => (start = process.hrtime()))
		migrator.on('end', () => (duration = process.hrtime(start)))

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
				this.printLogMessage(migrator.migratedFiles[file], migrator.direction)
			}
		})

		/**
		 * Log final status
		 */
		switch (migrator.status) {
			case 'completed':
				const completionMessage = migrator.direction === 'up' ? 'Migrated in' : 'Reverted in'
				console.log(`\n${completionMessage} ${this.colors.cyan(prettyHrTime(duration))}`)
				break
			case 'skipped':
				const message =
					migrator.direction === 'up' ? 'Already up to date' : 'Already at latest batch'
				console.log(this.colors.cyan(message))
				break
			case 'error':
				this.logger.fatal(migrator.error!)
				break
		}
	}
}
