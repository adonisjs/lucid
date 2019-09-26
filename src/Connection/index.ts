/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/database.ts" />

import knex from 'knex'
import { Pool } from 'tarn'
import { EventEmitter } from 'events'
import { Exception } from '@poppinss/utils'
import { patchKnex } from 'knex-dynamic-connection'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'
import { ConnectionConfigContract, ConnectionContract } from '@ioc:Adonis/Lucid/Database'

/**
 * Connection class manages a given database connection. Internally it uses
 * knex to build the database connection with appropriate database
 * driver.
 */
export class Connection extends EventEmitter implements ConnectionContract {
  /**
   * Reference to knex. The instance is created once the `open`
   * method is invoked
   */
  public client?: knex

  /**
   * Read client when read/write replicas are defined in the config, otherwise
   * it is a reference to the `client`.
   */
  public readClient?: knex

  /**
   * A boolean to know if connection operates on read/write
   * replicas
   */
  public hasReadWriteReplicas: boolean = !!(
    this.config.replicas &&
    this.config.replicas.read &&
    this.config.replicas.write
  )

  /**
   * Config for one or more read replicas. Only exists, when replicas are
   * defined
   */
  private _readReplicas: any[] = []

  /**
   * The round robin counter for reading config
   */
  private _roundRobinCounter = 0

  constructor (
    public name: string,
    public config: ConnectionConfigContract,
    private _logger: LoggerContract,
  ) {
    super()
    this._validateConfig()
  }

  /**
   * Validates the config to ensure that read/write replicas are defined
   * properly.
   */
  private _validateConfig () {
    if (this.config.replicas) {
      if (!this.config.replicas.read || !this.config.replicas.write) {
        throw new Exception(
          'Make sure to define read/write replicas or use connection property',
          500,
          'E_INCOMPLETE_REPLICAS_CONFIG',
        )
      }

      if (!this.config.replicas.read.connection || !this.config.replicas.read.connection) {
        throw new Exception(
          'Make sure to define connection property inside read/write replicas',
          500,
          'E_INVALID_REPLICAS_CONFIG',
        )
      }
    }
  }

  /**
   * Cleanup references
   */
  private _cleanup () {
    this.client = undefined
    this.readClient = undefined
    this._readReplicas = []
    this._roundRobinCounter = 0
  }

  /**
   * Does cleanup by removing knex reference and removing all listeners.
   * For the same of simplicity, we get rid of both read and write
   * clients, when anyone of them disconnects.
   */
  private _monitorPoolResources () {
    /**
     * Pool has destroyed and hence we must cleanup resources
     * as well.
     */
    this.pool!.on('poolDestroySuccess', () => {
      this._logger.trace({ connection: this.name }, 'pool destroyed, cleaning up resource')
      this._cleanup()
      this.emit('disconnect', this)
      this.removeAllListeners()
    })

    if (this.readPool !== this.pool) {
      this._logger.trace({ connection: this.name }, 'pool destroyed, cleaning up resource')
      this.readPool!.on('poolDestroySuccess', () => {
        this._cleanup()
        this.emit('disconnect', this)
        this.removeAllListeners()
      })
    }
  }

  /**
   * Returns normalized config object for write replica to be
   * used by knex
   */
  private _getWriteConfig (): knex.Config {
    if (!this.config.replicas) {
      return this.config
    }

    const { replicas, ...config } = this.config

    /**
     * Give preference to the replica write connection when and merge values from
     * the main connection object when defined.
     */
    if (typeof (replicas.write.connection) === 'string' || typeof (config.connection) === 'string') {
      config.connection = replicas.write.connection
    } else {
      config.connection = Object.assign({}, config.connection, replicas.write.connection)
    }

    /**
     * Add pool to the config when pool config defined on main connection
     * or the write replica
     */
    if (config.pool || replicas.write.pool) {
      config.pool = Object.assign({}, config.pool, replicas.write.pool)
    }

    return config as knex.Config
  }

  /**
   * Returns the config for read replicas.
   */
  private _getReadConfig (): knex.Config {
    if (!this.config.replicas) {
      return this.config
    }

    const { replicas, ...config } = this.config

    /**
     * Reading replicas and storing them as a reference, so that we
     * can pick a config from replicas as round robin.
     */
    this._readReplicas = (replicas.read.connection as Array<any>).map((one) => {
      if (typeof (one) === 'string' || typeof (config.connection) === 'string') {
        return one
      } else {
        return Object.assign({}, config.connection, one)
      }
    })

    /**
     * Add database property on the main connection, since knexjs needs it
     * internally
     */
    config.connection = {
      database: this._readReplicas[0].database,
    }

    /**
     * Add pool to the config when pool config defined on main connection
     * or the read replica
     */
    if (config.pool || replicas.read.pool) {
      config.pool = Object.assign({}, config.pool, replicas.read.pool)
    }

    return config as knex.Config
  }

  /**
   * Resolves connection config for the writer connection
   */
  private _writeConfigResolver (originalConfig: ConnectionConfigContract) {
    return originalConfig.connection
  }

  /**
   * Resolves connection config for the reader connection
   */
  private _readConfigResolver (originalConfig: ConnectionConfigContract) {
    if (!this._readReplicas.length) {
      return originalConfig.connection
    }

    const index = this._roundRobinCounter++ % this._readReplicas.length
    this._logger.trace({ connection: this.name }, `round robin using host at ${index} index`)
    return this._readReplicas[index]
  }

  /**
   * Creates the write connection
   */
  private _setupWriteConnection () {
    this.client = knex(this._getWriteConfig())
    patchKnex(this.client, this._writeConfigResolver.bind(this))
  }

  /**
   * Creates the read connection. If there aren't any replicas in use, then
   * it will use reference the write client
   */
  private _setupReadConnection () {
    if (!this.hasReadWriteReplicas) {
      this.readClient = this.client
      return
    }

    this._logger.trace({ connection: this.name }, 'setting up read/write replicas')

    this.readClient = knex(this._getReadConfig())
    patchKnex(this.readClient, this._readConfigResolver.bind(this))
  }

  /**
   * Returns the pool instance for the given connection
   */
  public get pool (): null | Pool<any> {
    return this.client ? this.client.client.pool : null
  }

  /**
   * Returns the pool instance for the read connection. When replicas are
   * not in use, then read/write pools are same.
   */
  public get readPool (): null | Pool<any> {
    return this.readClient ? this.readClient.client.pool : null
  }

  /**
   * Returns a boolean indicating if the connection is ready for making
   * database queries. If not, one must call `connect`.
   */
  public get ready (): boolean {
    return !!(this.client || this.readClient)
  }

  /**
   * Opens the connection by creating knex instance
   */
  public connect () {
    try {
      this._setupWriteConnection()
      this._setupReadConnection()
      this._monitorPoolResources()
      this.emit('connect', this)
    } catch (error) {
      this.emit('error', error, this)
      throw error
    }
  }

  /**
   * Closes DB connection by destroying knex instance. The `connection`
   * object must be free for garbage collection.
   *
   * In case of error this method will emit `close:error` event followed
   * by the `close` event.
   */
  public async disconnect (): Promise<void> {
    this._logger.trace({ connection: this.name }, 'destroying connection')

    /**
     * Disconnect write client
     */
    if (this.client) {
      try {
        await this.client.destroy()
      } catch (error) {
        this.emit('disconnect:error', error, this)
      }
    }

    /**
     * Disconnect read client when it exists and both clients
     * aren't same
     */
    if (this.readClient && this.readClient !== this.client) {
      try {
        await this.readClient.destroy()
      } catch (error) {
        this.emit('disconnect:error', error, this)
      }
    }
  }
}
