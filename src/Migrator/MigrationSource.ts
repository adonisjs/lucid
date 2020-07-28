/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { join, isAbsolute, extname } from 'path'
import { FileNode } from '@ioc:Adonis/Lucid/Migrator'
import { esmRequire, fsReadAll } from '@poppinss/utils'
import { ConnectionConfig } from '@ioc:Adonis/Lucid/Database'
import { SchemaConstructorContract } from '@ioc:Adonis/Lucid/Schema'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

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
	private getDirectoryFiles(directoryPath: string): Promise<FileNode<SchemaConstructorContract>[]> {
		const basePath = this.app.appRoot

		return new Promise((resolve, reject) => {
			const path = isAbsolute(directoryPath) ? directoryPath : join(basePath, directoryPath)
			const files = fsReadAll(path)
			try {
				resolve(
					files.sort().map((file) => {
						return {
							absPath: join(path, file),
							name: join(directoryPath, file.replace(RegExp(`${extname(file)}$`), '')),
							source: esmRequire(join(path, file)),
						}
					})
				)
			} catch (error) {
				reject(error)
			}
		})
	}

	/**
	 * Returns an array of migrations paths for a given connection. If paths
	 * are not defined, then `database/migrations` fallback is used
	 */
	private getMigrationsPath(): string[] {
		const directories = (this.config.migrations || {}).paths
		return directories && directories.length ? directories : ['database/migrations']
	}

	/**
	 * Returns an array of files for all defined directories
	 */
	public async getMigrations() {
		const migrationPaths = this.getMigrationsPath().sort()
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
