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
import { LoggerContract } from '@ioc:Adonis/Core/Logger'
import { ProfilerContract } from '@ioc:Adonis/Core/Profiler'

import {
  DatabaseContract,
  DatabaseClientOptions,
  DatabaseConfigContract,
  ConnectionManagerContract,
} from '@ioc:Adonis/Lucid/Database'

import { QueryClient } from '../QueryClient'
import { ConnectionManager } from '../Connection/Manager'

/**
 * Database class exposes the API to manage multiple connections and obtain an instance
 * of query/transaction clients.
 */
export class Database implements DatabaseContract {
  /**
   * Reference to connections manager
   */
  public manager: ConnectionManagerContract

  /**
   * Primary connection name
   */
  public primaryConnectionName = this._config.connection

  constructor (
    private _config: DatabaseConfigContract,
    private _logger: LoggerContract,
    private _profiler: ProfilerContract,
  ) {
    this.manager = new ConnectionManager(this._logger)
    this._registerConnections()
  }

  /**
   * Registering all connections with the manager, so that we can fetch
   * and connect with them whenver required.
   */
  private _registerConnections () {
    Object.keys(this._config.connections).forEach((name) => {
      this.manager.add(name, this._config.connections[name])
    })
  }

  /**
   * Returns the connection node from the connection manager
   */
  public getRawConnection (name: string) {
    return this.manager.get(name)
  }

  /**
   * Returns the query client for a given connection
   */
  public connection (
    connection: string = this.primaryConnectionName,
    options?: DatabaseClientOptions,
  ) {
    options = options || {}

    if (!options.profiler) {
      options.profiler = this._profiler
    }

    /**
     * Connect is noop when already connected
     */
    this.manager.connect(connection)

    /**
     * Disallow modes other than `read` or `write`
     */
    if (options.mode && !['read', 'write'].includes(options.mode)) {
      throw new Exception(`Invalid mode ${options.mode}. Must be read or write`)
    }

    /**
     * Fetching connection for the given name
     */
    const rawConnection = this.getRawConnection(connection)!.connection!

    /**
     * Generating query client for a given connection and setting appropriate
     * mode on it
     */
    this._logger.trace({ connection }, 'creating query client in %s mode', [options.mode || 'dual'])
    const queryClient = options.mode
      ? new QueryClient(options.mode, rawConnection)
      : new QueryClient('dual', rawConnection)

    /**
     * Passing profiler to the query client for profiling queries
     */
    queryClient.profiler = options.profiler
    return queryClient
  }

  /**
   * Returns query builder. Optionally one can define the mode as well
   */
  public query (options?: DatabaseClientOptions) {
    return this.connection(this.primaryConnectionName, options).query()
  }

  /**
   * Returns insert query builder. Always has to be dual or write mode and
   * hence it doesn't matter, since in both `dual` and `write` mode,
   * the `write` connection is always used.
   */
  public insertQuery (options?: DatabaseClientOptions) {
    return this.connection(this.primaryConnectionName, options).insertQuery()
  }

  /**
   * Returns instance of a query builder and selects the table
   */
  public from (table: any) {
    return this.connection().from(table)
  }

  /**
   * Returns insert query builder and selects the table
   */
  public table (table: any) {
    return this.connection().table(table)
  }

  /**
   * Returns a transaction instance on the default
   * connection
   */
  public transaction () {
    return this.connection().transaction()
  }

  /**
   * Returns an instance of raw query builder. Optionally one can
   * defined the `read/write` mode in which to execute the
   * query
   */
  public raw (sql: string, bindings?: any, options?: DatabaseClientOptions) {
    return this.connection(this.primaryConnectionName, options).raw(sql, bindings)
  }
}
