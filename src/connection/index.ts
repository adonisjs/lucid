/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Pool } from 'tarn'
import knex, { Knex } from 'knex'
import { EventEmitter } from 'node:events'
import { patchKnex } from 'knex-dynamic-connection'
import type { Logger } from '@adonisjs/core/logger'
// @ts-expect-error
import { resolveClientNameWithAliases } from 'knex/lib/util/helpers.js'

import * as errors from '../errors.js'
import LibSQLClient from '../clients/libsql.cjs'
import { clientsNames } from '../dialects/index.js'
import { Logger as ConnectionLogger } from './logger.js'
import type { ConnectionConfig, ConnectionContract } from '../types/database.js'

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
  client?: Knex

  /**
   * Read client when read/write replicas are defined in the config, otherwise
   * it is a reference to the `client`.
   */
  readClient?: Knex

  /**
   * Connection dialect name.
   * @deprecated
   * @see clientName
   */
  dialectName: ConnectionContract['clientName']

  /**
   * Connection client name.
   */
  clientName: ConnectionContract['clientName']

  /**
   * A boolean to know if connection operates on read/write
   * replicas
   */
  hasReadWriteReplicas: boolean

  /**
   * Config for one or more read replicas. Only exists, when replicas are
   * defined
   */
  private readReplicas: any[] = []

  /**
   * The round robin counter for reading config
   */
  private roundRobinCounter = 0

  constructor(
    public name: string,
    public config: ConnectionConfig,
    private logger: Logger
  ) {
    super()
    this.validateConfig()
    this.clientName = resolveClientNameWithAliases(this.config.client)
    this.dialectName = this.clientName

    this.hasReadWriteReplicas = !!(
      this.config.replicas &&
      this.config.replicas.read &&
      this.config.replicas.write
    )

    if (!clientsNames.includes(this.clientName)) {
      throw new errors.E_UNSUPPORTED_CLIENT([this.clientName])
    }
  }

  /**
   * Validates the config to ensure that read/write replicas are defined
   * properly.
   */
  private validateConfig(): void {
    if (this.config.replicas) {
      if (!this.config.replicas.read || !this.config.replicas.write) {
        throw new errors.E_INCOMPLETE_REPLICAS_CONFIG()
      }

      if (!this.config.replicas.read.connection || !this.config.replicas.read.connection) {
        throw new errors.E_INVALID_REPLICAS_CONFIG()
      }
    }
  }

  /**
   * Cleanup references
   */
  private cleanup(): void {
    this.client = undefined
    this.readClient = undefined
    this.readReplicas = []
    this.roundRobinCounter = 0
  }

  /**
   * Does cleanup by removing knex reference and removing all listeners.
   * For the same of simplicity, we get rid of both read and write
   * clients, when anyone of them disconnects.
   */
  private monitorPoolResources(): void {
    /**
     * Pool has destroyed and hence we must cleanup resources
     * as well.
     */
    this.pool!.on('poolDestroySuccess', () => {
      this.logger.trace({ connection: this.name }, 'pool destroyed, cleaning up resource')
      this.cleanup()
      this.emit('disconnect', this)
      this.removeAllListeners()
    })

    if (this.readPool !== this.pool) {
      this.readPool!.on('poolDestroySuccess', () => {
        this.logger.trace({ connection: this.name }, 'pool destroyed, cleaning up resource')
        this.cleanup()
        this.emit('disconnect', this)
        this.removeAllListeners()
      })
    }
  }

  /**
   * Returns normalized config object for write replica to be
   * used by knex
   */
  private getWriteConfig(): Knex.Config {
    if (!this.config.replicas) {
      /**
       * Replacing string based libsql client with the
       * actual implementation
       */
      if (this.config.client === 'libsql') {
        return {
          ...this.config,
          client: LibSQLClient as any,
        }
      }

      return this.config
    }

    const { replicas, ...config } = this.config

    /**
     * Give preference to the replica write connection when and merge values from
     * the main connection object when defined.
     */
    if (typeof replicas.write.connection === 'string' || typeof config.connection === 'string') {
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

    return config as Knex.Config
  }

  /**
   * Returns the config for read replicas.
   */
  private getReadConfig(): Knex.Config {
    if (!this.config.replicas) {
      return this.config
    }

    const { replicas, ...config } = this.config

    /**
     * Reading replicas and storing them as a reference, so that we
     * can pick a config from replicas as round robin.
     */
    this.readReplicas = (replicas.read.connection as Array<any>).map((one) => {
      if (typeof one === 'string' || typeof config.connection === 'string') {
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
      database: this.readReplicas[0].database,
    }

    /**
     * Add pool to the config when pool config defined on main connection
     * or the read replica
     */
    if (config.pool || replicas.read.pool) {
      config.pool = Object.assign({}, config.pool, replicas.read.pool)
    }

    return config as Knex.Config
  }

  /**
   * Resolves connection config for the writer connection
   */
  private writeConfigResolver(originalConfig: ConnectionConfig) {
    return originalConfig.connection
  }

  /**
   * Resolves connection config for the reader connection
   */
  private readConfigResolver(originalConfig: ConnectionConfig) {
    if (!this.readReplicas.length) {
      return originalConfig.connection
    }

    const index = this.roundRobinCounter++ % this.readReplicas.length
    this.logger.trace({ connection: this.name }, `round robin using host at ${index} index`)
    return this.readReplicas[index]
  }

  /**
   * Creates the write connection.
   */
  private setupWriteConnection() {
    this.client = knex.knex(
      Object.assign({ log: new ConnectionLogger(this.name, this.logger) }, this.getWriteConfig(), {
        debug: false,
      })
    )

    // @ts-ignore
    patchKnex(this.client, this.writeConfigResolver.bind(this))
  }

  /**
   * Creates the read connection. If there aren't any replicas in use, then
   * it will use the write client instead.
   */
  private setupReadConnection() {
    if (!this.hasReadWriteReplicas) {
      this.readClient = this.client
      return
    }

    this.logger.trace({ connection: this.name }, 'setting up read/write replicas')
    this.readClient = knex.knex(
      Object.assign({ log: new ConnectionLogger(this.name, this.logger) }, this.getReadConfig(), {
        debug: false,
      })
    )

    // @ts-ignore
    patchKnex(this.readClient, this.readConfigResolver.bind(this))
  }

  /**
   * Returns the pool instance for the given connection
   */
  get pool(): null | Pool<any> {
    return this.client ? this.client.client.pool : null
  }

  /**
   * Returns the pool instance for the read connection. When replicas are
   * not in use, then read/write pools are same.
   */
  get readPool(): null | Pool<any> {
    return this.readClient ? this.readClient.client.pool : null
  }

  /**
   * Returns a boolean indicating if the connection is ready for making
   * database queries. If not, one must call `connect`.
   */
  get ready(): boolean {
    return !!(this.client || this.readClient)
  }

  /**
   * Opens the connection by creating knex instance
   */
  connect() {
    try {
      this.setupWriteConnection()
      this.setupReadConnection()
      this.monitorPoolResources()
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
  async disconnect(): Promise<void> {
    this.logger.trace({ connection: this.name }, 'destroying connection')

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
