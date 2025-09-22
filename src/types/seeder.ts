/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type FileNode, type QueryClientContract } from './database.js'

/**
 * Shape of file node returned by the run method
 */
export type SeederFileNode = {
  status: 'pending' | 'completed' | 'failed' | 'ignored'
  error?: any
  file: FileNode<unknown>
}

export type SeederConstructorContract = {
  environment: string[]
  new (client: QueryClientContract): {
    client: QueryClientContract
    run(): Promise<void>
  }
}
