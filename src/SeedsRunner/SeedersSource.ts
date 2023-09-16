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
 * Seeders source exposes the API to read the seeders from disk for a given connection.
 */
export class SeedersSource {
  constructor(
    private config: ConnectionConfig,
    private app: ApplicationContract
  ) {}

  /**
   * Returns an array of files inside a given directory. Relative
   * paths are resolved from the project root
   */
  private async getDirectoryFiles(directoryPath: string): Promise<FileNode<unknown>[]> {
    const { files } = await sourceFiles(this.app.appRoot, directoryPath, false)
    return files
  }

  /**
   * Returns an array of seeders paths for a given connection. If paths
   * are not defined, then `database/seeders` fallback is used
   */
  private getSeedersPaths(): string[] {
    const directories = (this.config.seeders || {}).paths
    const defaultDirectory = this.app.directoriesMap.get('seeds') || 'database/seeders'
    return directories && directories.length ? directories : [`./${defaultDirectory}`]
  }

  /**
   * Returns an array of files for the defined seed directories
   */
  public async getSeeders() {
    const seedersPaths = this.getSeedersPaths()
    const directories = await Promise.all(
      seedersPaths.map((directoryPath) => {
        return this.getDirectoryFiles(directoryPath)
      })
    )

    return directories.reduce((result, directory) => {
      result = result.concat(directory)
      return result
    }, [])
  }
}
