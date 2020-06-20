/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { join, extname } from 'path'
import { esmRequire, fsReadAll } from '@poppinss/utils'
import { SeederFileNode } from '@ioc:Adonis/Lucid/Seeder'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

/**
 * Seeds runner exposes the API to list files from the seeds and
 * also run a collection of seeders
 */
export class SeedsRunner {
  constructor (
    private seedsDir: string,
    private isInDevelopment: boolean,
  ) {}

  /**
   * Returns an array of files inside a given directory. Relative
   * paths are resolved from the project root
   */
  public listSeeders (): Promise<SeederFileNode[]> {
    return new Promise((resolve, reject) => {
      const files = fsReadAll(this.seedsDir)
      try {
        resolve(files.sort().map((file) => {
          const source = esmRequire(join(this.seedsDir, file))
          const ignored = source.developmentOnly && !this.isInDevelopment

          return {
            absPath: join(this.seedsDir, file),
            name: file.replace(RegExp(`${extname(file)}$`), ''),
            source: esmRequire(join(this.seedsDir, file)),
            status: ignored ? 'ignored' : 'pending',
          }
        }))
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Returns an array of files inside a given directory. Relative
   * paths are resolved from the project root
   */
  public async run (
    seeder: SeederFileNode,
    client: QueryClientContract,
  ): Promise<SeederFileNode> {
    /**
     * Ignore when running in non-development environment and seeder is development
     * only
     */
    if (seeder.source.developmentOnly && !this.isInDevelopment) {
      return seeder
    }

    try {
      const seederInstance = new seeder.source(client)
      if (typeof (seederInstance.run) !== 'function') {
        throw new Error(`Missing method "run" on "${seeder.name}" seeder`)
      }

      await seederInstance.run()
      seeder.status = 'completed'
    } catch (error) {
      seeder.status = 'failed'
      seeder.error = error
    }

    return seeder
  }
}
