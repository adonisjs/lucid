/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Application } from '@adonisjs/core/app'
import { FileNode, QueryClientContract, SharedConfigNode } from '../../adonis-typings/database.js'
import { SeederConstructorContract, SeederFileNode } from '../../adonis-typings/seeder.js'

import { SeedersSource } from './seeders_source.js'
import { Database } from '../database/index.js'

/**
 * Seeds Runner exposes the API to traverse seeders and execute them
 * in bulk
 */
export class SeedsRunner {
  private client: QueryClientContract
  private config: SharedConfigNode

  nodeEnvironment: string

  constructor(
    private db: Database,
    private app: Application<any>,
    private connectionName?: string
  ) {
    this.client = this.db.connection(this.connectionName || this.db.primaryConnectionName)
    this.config = this.db.getRawConnection(this.client.connectionName)!.config
    this.nodeEnvironment = this.app.nodeEnvironment
  }

  /**
   * Returns the seeder source by ensuring value is a class constructor
   */
  private async getSeederSource(file: FileNode<unknown>): Promise<SeederConstructorContract> {
    const source = await file.getSource()
    if (typeof source === 'function') {
      return source as SeederConstructorContract
    }

    throw new Error(`Invalid schema class exported by "${file.name}"`)
  }

  /**
   * Returns an array of seeders
   */
  async getList() {
    return new SeedersSource(this.config, this.app).getSeeders()
  }

  /**
   * Executes the seeder
   */
  async run(file: FileNode<unknown>): Promise<SeederFileNode> {
    const Source = await this.getSeederSource(file)

    const seeder: SeederFileNode = {
      status: 'pending',
      file: file,
    }

    /**
     * Ignore when when the node environement is not the same as the seeder configuration.
     */
    if (Source.environment && !Source.environment.includes(this.nodeEnvironment)) {
      seeder.status = 'ignored'
      return seeder
    }

    try {
      const seederInstance = new Source(this.client)
      if (typeof seederInstance.run !== 'function') {
        throw new Error(`Missing method "run" on "${seeder.file.name}" seeder`)
      }

      await seederInstance.run()
      seeder.status = 'completed'
    } catch (error) {
      seeder.status = 'failed'
      seeder.error = error
    }

    return seeder
  }

  /**
   * Close database connections
   */
  async close() {
    await this.db.manager.closeAll(true)
  }
}
