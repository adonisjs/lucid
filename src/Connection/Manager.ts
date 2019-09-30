/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { EventEmitter } from 'events'
import { Exception } from '@poppinss/utils'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'

import {
  ConnectionContract,
  ConnectionConfigContract,
  ConnectionManagerContract,
} from '@ioc:Adonis/Lucid/Database'

import { Connection } from './index'

/**
 * Connection manager job is to manage multiple named connections. You can add any number
 * or connections by registering their config only once and then make use of `connect`
 * and `close` methods to create and destroy db connections.
 */
export class ConnectionManager extends EventEmitter implements ConnectionManagerContract {
  public connections: ConnectionManagerContract['connections'] = new Map()

  constructor (private _logger: LoggerContract) {
    super()
  }

  /**
   * Monitors a given connection by listening for lifecycle events
   */
  private _monitorConnection (connection: ConnectionContract) {
    /**
     * Listens for disconnect to set the connection state and cleanup
     * memory
     */
    connection.on('disconnect', ($connection) => {
      const internalConnection = this.get($connection.name)

      /**
       * This will be false, when connection was released at the
       * time of closing
       */
      if (!internalConnection) {
        return
      }

      this.emit('disconnect', $connection)
      this._logger.trace({ connection: internalConnection.name }, 'disconnecting connection inside manager')

      delete internalConnection.connection
      internalConnection.state = 'closed'
    })

    /**
     * Listens for connect to set the connection state to open
     */
    connection.on('connect', ($connection) => {
      const internalConnection = this.get($connection.name)
      if (!internalConnection) {
        return
      }

      this.emit('connect', $connection)
      internalConnection.state = 'open'
    })

    /**
     * Listens for error event to proxy it to the client
     */
    connection.on('error', (error, $connection) => {
      this.emit('error', error, $connection)
    })
  }

  /**
   * Add a named connection with it's configuration. Make sure to call `connect`
   * before using the connection to make database queries.
   */
  public add (connectionName: string, config: ConnectionConfigContract): void {
    /**
     * Raise an exception when someone is trying to re-add the same connection. We
     * should not silently avoid this scanerio, since there is a valid use case
     * in which the config has been changed and someone wants to re-add the
     * connection with new config. In that case, they must
     *
     * 1. Close and release the old connection
     * 2. Then add the new connection
     */
    if (this.isConnected(connectionName)) {
      throw new Exception(
        `Attempt to add duplicate connection ${connectionName} failed`,
        500,
        'E_DUPLICATE_DB_CONNECTION',
      )
    }

    this._logger.trace({ connection: connectionName }, 'adding new connection to the manager')
    this.connections.set(connectionName, {
      name: connectionName,
      config: config,
      state: 'registered',
    })
  }

  /**
   * Connect to the database using config for a given named connection
   */
  public connect (connectionName: string): void {
    const connection = this.connections.get(connectionName)
    if (!connection) {
      throw new Exception(
        `Cannot connect to unregistered connection ${connectionName}`,
        500,
        'E_UNMANAGED_DB_CONNECTION',
      )
    }

    /**
     * Ignore when the there is already a connection.
     */
    if (this.isConnected(connection.name)) {
      return
    }

    /**
     * Create a new connection and monitor it's state
     */
    connection.connection = new Connection(connection.name, connection.config, this._logger)
    this._monitorConnection(connection.connection)
    connection.connection.connect()
  }

  /**
   * Returns the connection node for a given named connection
   */
  public get (connectionName: string) {
    return this.connections.get(connectionName)
  }

  /**
   * Returns a boolean telling if we have connection details for
   * a given named connection. This method doesn't tell if
   * connection is connected or not.
   */
  public has (connectionName: string) {
    return this.connections.has(connectionName)
  }

  /**
   * Returns a boolean telling if connection has been established
   * with the database or not
   */
  public isConnected (connectionName: string) {
    if (!this.has(connectionName)) {
      return false
    }

    const connection = this.get(connectionName)!
    return (!!connection.connection && connection.state === 'open')
  }

  /**
   * Closes a given connection and can optionally release it from the
   * tracking list
   */
  public async close (connectionName: string, release: boolean = false) {
    if (this.isConnected(connectionName)) {
      await this.get(connectionName)!.connection!.disconnect()
    }

    if (release) {
      await this.release(connectionName)
    }
  }

  /**
   * Close all tracked connections
   */
  public async closeAll (release: boolean = false) {
    await Promise.all(Array.from(this.connections.keys()).map((name) => this.close(name, release)))
  }

  /**
   * Release a connection. This will disconnect the connection
   * and will delete it from internal list
   */
  public async release (connectionName: string) {
    if (this.isConnected(connectionName)) {
      await this.close(connectionName, true)
    } else {
      this.connections.delete(connectionName)
    }
  }
}
