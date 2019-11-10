/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { readdir } from 'fs'
import { esmRequire } from '@poppinss/utils'
import { join, isAbsolute, extname } from 'path'
import { MigrationNode } from '@ioc:Adonis/Lucid/Migrator'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { ConnectionConfigContract } from '@ioc:Adonis/Lucid/Database'

/**
 * Migration source exposes the API to read the migration files
 * from disk for a given connection.
 */
export class MigrationSource {
  constructor (
    private _config: ConnectionConfigContract,
    private _app: ApplicationContract,
  ) {}

  /**
   * Returns an array of files inside a given directory. Relative
   * paths are resolved from the project root
   */
  private _getDirectoryFiles (directoryPath: string): Promise<MigrationNode[]> {
    return new Promise((resolve, reject) => {
      const path = isAbsolute(directoryPath) ? directoryPath : join(this._app.appRoot, directoryPath)
      readdir(path, (error, files) => {
        if (error) {
          reject(error)
          return
        }

        return resolve(files.sort().map((file) => {
          return {
            absPath: join(path, file),
            name: join(directoryPath, file.replace(RegExp(`${extname(file)}$`), '')),
            source: esmRequire(join(path, file)),
          }
        }))
      })
    })
  }

  /**
   * Returns an array of migrations paths for a given connection. If paths
   * are not defined, then `database/migrations` fallback is used
   */
  private _getMigrationsPath (): string[] {
    return (this._config.migrations && this._config.migrations.paths) || ['database/migrations']
  }

  /**
   * Returns an array of files for all defined directories
   */
  public async getMigrations () {
    const migrationPaths = this._getMigrationsPath().sort()
    const directories = await Promise.all(migrationPaths.map((directoryPath) => {
      return this._getDirectoryFiles(directoryPath)
    }))

    return directories.reduce((result, directory) => {
      result = result.concat(directory)
      return result
    }, [])
  }
}
