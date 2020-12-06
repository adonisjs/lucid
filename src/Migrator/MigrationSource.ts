/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { ConnectionConfig, FileNode } from '@ioc:Adonis/Lucid/Database'
import { sourceFiles } from '../utils'

/**
 * Migration source exposes the API to read the migration files
 * from disk for a given connection.
 */
export class MigrationSource {
	constructor(private config: ConnectionConfig, private app: ApplicationContract) {}

	/**
	 * Returns an array of files inside a given directory. Relative
	 * paths are resolved from the project root
	 */
	private async getDirectoryFiles(directoryPath: string): Promise<FileNode<unknown>[]> {
		let { files } = await sourceFiles(this.app.appRoot, directoryPath)

		if (this.config.migrations?.naturalSort) {
			files = files.sort((a, b) =>
				a.filename!.localeCompare(b.filename!, undefined, { numeric: true, sensitivity: 'base' })
			)
		}

		return files
	}

	/**
	 * Returns an array of migrations paths for a given connection. If paths
	 * are not defined, then `database/migrations` fallback is used
	 */
	private getMigrationsPath(): string[] {
		const directories = (this.config.migrations || {}).paths
		const defaultDirectory = this.app.directoriesMap.get('migrations') || 'database/migrations'
		return directories && directories.length ? directories : [`./${defaultDirectory}`]
	}

	/**
	 * Returns an array of files for all defined directories
	 */
	public async getMigrations() {
		const migrationPaths = this.getMigrationsPath()
		const directories = await Promise.all(
			migrationPaths.map((directoryPath) => {
				return this.getDirectoryFiles(directoryPath)
			})
		)

		return directories.reduce((result, directory) => {
			result = result.concat(directory)
			return result
		}, [])
	}
}
