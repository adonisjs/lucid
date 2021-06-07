/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Lucid/Migrator' {
  import { EventEmitter } from 'events'
  import { ApplicationContract } from '@ioc:Adonis/Core/Application'
  import { FileNode, DatabaseContract } from '@ioc:Adonis/Lucid/Database'

  /**
   * Options accepted by migrator constructor
   */
  export type MigratorOptions =
    | {
        direction: 'up'
        connectionName?: string
        dryRun?: boolean
      }
    | {
        direction: 'down'
        batch?: number
        connectionName?: string
        dryRun?: boolean
      }

  /**
   * Shape of migrated file within migrator
   */
  export type MigratedFileNode = {
    status: 'completed' | 'error' | 'pending'
    queries: string[]
    file: FileNode<unknown>
    batch: number
  }

  /**
   * Shape of migrated file within migrator
   */
  export type MigrationListNode = {
    name: string
    status: 'pending' | 'migrated' | 'corrupt'
    batch?: number
    migrationTime?: Date
  }

  /**
   * Shape of the migrator
   */
  export interface MigratorContract extends EventEmitter {
    dryRun: boolean
    direction: 'up' | 'down'
    status: 'completed' | 'skipped' | 'pending' | 'error'
    error: null | Error
    migratedFiles: { [file: string]: MigratedFileNode }
    run(): Promise<void>
    getList(): Promise<MigrationListNode[]>
    close(): Promise<void>
    on(event: 'start', callback: () => void): this
    on(event: 'end', callback: () => void): this
    on(event: 'acquire:lock', callback: () => void): this
    on(event: 'release:lock', callback: () => void): this
    on(event: 'create:schema:table', callback: () => void): this
    on(event: 'migration:start', callback: (file: MigratedFileNode) => void): this
    on(event: 'migration:completed', callback: (file: MigratedFileNode) => void): this
    on(event: 'migration:error', callback: (file: MigratedFileNode) => void): this
  }

  /**
   * Migrator class constructor
   */
  const Migrator: {
    new (db: DatabaseContract, app: ApplicationContract, options: MigratorOptions): MigratorContract
  }

  export default Migrator
}
