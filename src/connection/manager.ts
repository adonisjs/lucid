/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debug } from '../debug.js'
import * as errors from '../errors.js'
import { NOOP_EMITTER } from '../helpers.js'
import { Connection } from './connection.js'
import type {
  DatabaseEmitter,
  ConnectionConfig,
  ConnectionLogger,
  ManagerConnection,
} from '../types/connection.js'

export class ConnectionManager {
  #logger?: ConnectionLogger
  #emitter: DatabaseEmitter

  /**
   * List of managed connections
   */
  connections: Map<string, ManagerConnection> = new Map()

  constructor(logger?: ConnectionLogger, emitter?: DatabaseEmitter) {
    this.#logger = logger
    this.#emitter = emitter ?? NOOP_EMITTER
  }

  /**
   * Returns the connection node for a given named connection
   */
  get(identifier: string): ManagerConnection | undefined {
    return this.connections.get(identifier)
  }

  /**
   * Check if a connection has been registered with the manager
   */
  has(identifier: string): boolean {
    return this.connections.has(identifier)
  }

  /**
   * Check if a connection is registered and in "open" state
   */
  isConnected(identifier: string): boolean {
    if (!this.has(identifier)) {
      return false
    }

    const connection = this.get(identifier)!
    return !!connection.connection && connection.state === 'open'
  }

  /**
   * Add a named connection with it's configuration. Make sure to call `connect`
   * before using the connection to make database queries.
   */
  add(identifier: string, config: ConnectionConfig): void {
    /**
     * Noop when connection already exists. If one wants to change the config, they
     * must release the old connection and add a new one
     */
    if (this.has(identifier)) {
      return
    }

    debug('adding "%s" connection to the manager. %O', identifier, config)
    this.connections.set(identifier, {
      identifier,
      name: identifier,
      state: 'registered',
      config,
    })
  }

  /**
   * Create the connection object and initialize knex instances
   */
  connect(identifier: string): void {
    const connection = this.connections.get(identifier)
    if (!connection) {
      throw new errors.E_UNMANAGED_DB_CONNECTION([identifier])
    }

    /**
     * Ignore when the there is already a connection.
     */
    if (this.isConnected(connection.identifier)) {
      return
    }

    /**
     * Create a new connection and monitor it's state
     */
    connection.connection = new Connection(connection.identifier, connection.config, this.#logger)
    connection.state = 'open'
    this.#emitter.emit('db:connection:connect', connection.connection)

    connection.connection.onClose(($connection) => {
      debug('"%s" connection closed', $connection.identifier)
      this.#emitter.emit('db:connection:disconnect', [null, $connection])

      const internalConnection = this.get($connection.identifier)
      if (internalConnection) {
        internalConnection.state = 'closed'
        internalConnection.connection = undefined
      }
    })

    connection.connection.onCloseError((error, $connection) => {
      debug('"%s" connection closed with error %O', $connection.identifier, error)

      this.#emitter.emit('db:connection:disconnect', [error, $connection])
      const internalConnection = this.get($connection.identifier)
      if (internalConnection) {
        internalConnection.state = 'closed'
        internalConnection.connection = undefined
      }
    })
  }

  /**
   * Closes a given connection and can optionally release it from
   * the manager.
   */
  async close(identifier: string, release: boolean = false): Promise<void> {
    if (this.isConnected(identifier)) {
      const connection = this.get(identifier)!
      await connection.connection!.close()
      connection.state = 'closing'
    }

    if (release) {
      await this.release(identifier)
    }
  }

  /**
   * Release a connection. Calling this method will first
   * close the connection.
   */
  async release(identifier: string): Promise<void> {
    if (this.isConnected(identifier)) {
      await this.close(identifier, true)
    } else {
      this.connections.delete(identifier)
    }
  }
}
