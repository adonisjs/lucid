/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { FileNode } from './database.js'

/**
 * Options accepted by migrator constructor
 */
export type MigratorOptions =
  | {
      direction: 'up'
      connectionName?: string
      dryRun?: boolean
      disableLocks?: boolean
    }
  | {
      direction: 'down'
      batch?: number
      connectionName?: string
      dryRun?: boolean
      disableLocks?: boolean
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
