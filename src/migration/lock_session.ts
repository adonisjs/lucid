/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Emitter } from '@adonisjs/core/events'

import { QueryClient } from '../query_client/index.js'
import { type ConnectionContract } from '../types/database.js'

/**
 * A database session that the migration runner takes from the pool of
 * a connection, and keeps for the whole run.
 *
 * Advisory locks belong to a database session. The runner takes the lock,
 * runs each migration, and releases the lock on this session. Therefore,
 * when the session ends, the database releases the lock and the active
 * migration fails with it.
 */
export class LockSession {
  /**
   * Takes a connection from the pool of the given connection and pins
   * a query client to it
   */
  static async open(connection: ConnectionContract, emitter: Emitter<any>) {
    const rawConnection = await connection.client!.client.acquireConnection()
    return new LockSession(connection, emitter, rawConnection)
  }

  /**
   * The query client that runs each query on the pinned connection. It is
   * in "write" mode, so that its reads never use a read replica.
   */
  readonly client: QueryClient

  /**
   * Becomes true when the driver reports that the session has ended
   */
  #lost = false

  #markAsLost = () => {
    this.#lost = true
  }

  private constructor(
    private connection: ConnectionContract,
    emitter: Emitter<any>,
    private rawConnection: any
  ) {
    this.client = new QueryClient('write', connection, emitter, rawConnection)

    /**
     * The drivers emit "end" when the session ends, for example after
     * "pg_terminate_backend" or "KILL", and "error" for an error of the
     * connection
     */
    this.rawConnection.on('end', this.#markAsLost)
    this.rawConnection.on('error', this.#markAsLost)
  }

  /**
   * Returns true when the database session of the pinned connection
   * has ended
   */
  isLost(): boolean {
    return this.#lost
  }

  /**
   * Gives the connection back to the pool. The pool validates a connection
   * before it gives it to a query, and destroys a connection whose session
   * has ended.
   */
  release() {
    this.rawConnection.off('end', this.#markAsLost)
    this.rawConnection.off('error', this.#markAsLost)
    this.connection.client!.client.releaseConnection(this.rawConnection)
  }
}
