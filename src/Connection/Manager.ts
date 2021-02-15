/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { EmitterContract } from '@ioc:Adonis/Core/Event'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'
import { HealthReportEntry } from '@ioc:Adonis/Core/HealthCheck'

import {
  ReportNode,
  ConnectionNode,
  ConnectionConfig,
  ConnectionContract,
  ConnectionManagerContract,
} from '@ioc:Adonis/Lucid/Database'

import { Connection } from './index'

/**
 * Connection manager job is to manage multiple named connections. You can add any number
 * or connections by registering their config only once and then make use of `connect`
 * and `close` methods to create and destroy db connections.
 */
export class ConnectionManager implements ConnectionManagerContract {
  /**
   * List of managed connections
   */
  public connections: ConnectionManagerContract['connections'] = new Map()

  /**
   * Connections for which the config was patched. They must get removed
   * overtime, unless application is behaving unstable.
   */
  private orphanConnections: Set<ConnectionContract> = new Set()

  constructor(private logger: LoggerContract, private emitter: EmitterContract) {}

  /**
   * Handles disconnection of a connection
   */
  private handleDisconnect(connection: ConnectionContract) {
    /**
     * We received the close event on the orphan connection and not the connection
     * that is in use
     */
    if (this.orphanConnections.has(connection)) {
      this.orphanConnections.delete(connection)
      this.emitter.emit('db:connection:disconnect', connection)
      this.logger.trace({ connection: connection.name }, 'disconnecting connection inside manager')
      return
    }

    const internalConnection = this.get(connection.name)

    /**
     * This will be false, when connection was released at the
     * time of closing
     */
    if (!internalConnection) {
      return
    }

    this.emitter.emit('db:connection:disconnect', connection)
    this.logger.trace({ connection: connection.name }, 'disconnecting connection inside manager')

    delete internalConnection.connection
    internalConnection.state = 'closed'
  }

  /**
   * Handles event when a new connection is added
   */
  private handleConnect(connection: ConnectionContract) {
    const internalConnection = this.get(connection.name)
    if (!internalConnection) {
      return
    }

    this.emitter.emit('db:connection:connect', connection)
    internalConnection.state = 'open'
  }

  /**
   * Monitors a given connection by listening for lifecycle events
   */
  private monitorConnection(connection: ConnectionContract): void {
    connection.on('disconnect', ($connection) => this.handleDisconnect($connection))
    connection.on('connect', ($connection) => this.handleConnect($connection))
    connection.on('error', (error, $connection) => {
      this.emitter.emit('db:connection:error', [error, $connection])
    })
  }

  /**
   * Add a named connection with it's configuration. Make sure to call `connect`
   * before using the connection to make database queries.
   */
  public add(connectionName: string, config: ConnectionConfig): void {
    /**
     * Noop when connection already exists. If one wants to change the config, they
     * must release the old connection and add a new one
     */
    if (this.has(connectionName)) {
      return
    }

    this.logger.trace({ connection: connectionName }, 'adding new connection to the manager')
    this.connections.set(connectionName, {
      name: connectionName,
      config: config,
      state: 'registered',
    })
  }

  /**
   * Connect to the database using config for a given named connection
   */
  public connect(connectionName: string): void {
    const connection = this.connections.get(connectionName)
    if (!connection) {
      throw new Exception(
        `Cannot connect to unregistered connection ${connectionName}`,
        500,
        'E_UNMANAGED_DB_CONNECTION'
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
    connection.connection = new Connection(connection.name, connection.config, this.logger)
    this.monitorConnection(connection.connection)
    connection.connection.connect()
  }

  /**
   * Patching the config
   */
  public patch(connectionName: string, config: ConnectionConfig): void {
    const connection = this.get(connectionName)

    /**
     * If connection is missing, then simply add it
     */
    if (!connection) {
      return this.add(connectionName, config)
    }

    /**
     * Move the current connection to the orphan connections. We need
     * to keep a seperate track of old connections to make sure
     * they cleanup after some time
     */
    if (connection.connection) {
      this.orphanConnections.add(connection.connection)
      connection.connection.disconnect()
    }

    /**
     * Updating config and state. Next call to connect will use the
     * new config
     */
    connection.state = 'migrating'
    connection.config = config

    /**
     * Removing the connection right away, so that the next call to `connect`
     * creates a new one with new config
     */
    delete connection.connection
  }

  /**
   * Returns the connection node for a given named connection
   */
  public get(connectionName: string): ConnectionNode | undefined {
    return this.connections.get(connectionName)
  }

  /**
   * Returns a boolean telling if we have connection details for
   * a given named connection. This method doesn't tell if
   * connection is connected or not.
   */
  public has(connectionName: string): boolean {
    return this.connections.has(connectionName)
  }

  /**
   * Returns a boolean telling if connection has been established
   * with the database or not
   */
  public isConnected(connectionName: string): boolean {
    if (!this.has(connectionName)) {
      return false
    }

    const connection = this.get(connectionName)!
    return !!connection.connection && connection.state === 'open'
  }

  /**
   * Closes a given connection and can optionally release it from the
   * tracking list
   */
  public async close(connectionName: string, release: boolean = false): Promise<void> {
    if (this.isConnected(connectionName)) {
      const connection = this.get(connectionName)!
      await connection.connection!.disconnect()
      connection.state = 'closing'
    }

    if (release) {
      await this.release(connectionName)
    }
  }

  /**
   * Close all tracked connections
   */
  public async closeAll(release: boolean = false): Promise<void> {
    await Promise.all(Array.from(this.connections.keys()).map((name) => this.close(name, release)))
  }

  /**
   * Release a connection. This will disconnect the connection
   * and will delete it from internal list
   */
  public async release(connectionName: string): Promise<void> {
    if (this.isConnected(connectionName)) {
      await this.close(connectionName, true)
    } else {
      this.connections.delete(connectionName)
    }
  }

  /**
   * Returns the report for all the connections marked for healthChecks.
   */
  public async report(): Promise<HealthReportEntry & { meta: ReportNode[] }> {
    const reports = await Promise.all(
      Array.from(this.connections.keys())
        .filter((one) => this.get(one)!.config.healthCheck)
        .map((one) => {
          this.connect(one)
          return this.get(one)!.connection!.getReport()
        })
    )

    const healthy = !reports.find((report) => !!report.error)

    return {
      displayName: 'Database',
      health: {
        healthy,
        message: healthy
          ? 'All connections are healthy'
          : 'One or more connections are not healthy',
      },
      meta: reports,
    }
  }
}
