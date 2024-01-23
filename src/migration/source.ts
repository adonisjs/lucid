/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Application } from '@adonisjs/core/app'
import { sourceFiles } from '../utils/index.js'
import { SharedConfigNode, FileNode } from '../types/database.js'

/**
 * Migration source exposes the API to read the migration files
 * from disk for a given connection.
 */
export class MigrationSource {
  constructor(
    private config: SharedConfigNode,
    private app: Application<any>
  ) {}

  /**
   * Returns an array of files inside a given directory. Relative
   * paths are resolved from the project root
   */
  private async getDirectoryFiles(directoryPath: string): Promise<FileNode<unknown>[]> {
    const { files } = await sourceFiles(
      this.app.appRoot,
      directoryPath,
      this.config.migrations?.naturalSort || false
    )

    return files
  }

  /**
   * Returns an array of migrations paths for a given connection. If paths
   * are not defined, then `database/migrations` fallback is used
   */
  private getMigrationsPath(): string[] {
    const directories = (this.config.migrations || {}).paths
    const defaultDirectory =
      this.app.relativePath(this.app.migrationsPath()) || 'database/migrations'
    return directories && directories.length ? directories : [`./${defaultDirectory}`]
  }

  /**
   * Returns an array of files for all defined directories
   */
  async getMigrations() {
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
