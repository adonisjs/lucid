/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Pool } from 'tarn'
import knex, { Knex } from 'knex'
import { patchKnex } from 'knex-dynamic-connection'
import { RuntimeException } from '@poppinss/exception'

import { debug } from '../debug.js'
import * as errors from '../errors.js'
import { dialects } from '../dialects/main.js'
import { QueryClient } from '../database_clients/query_client.js'
import type { DialectContract } from '../types/dialect.js'
import type {
  ConnectionConfig,
  ConnectionLogger,
  SupportedDialectNames,
} from '../types/connection.js'
import { createKnexLogger } from './logger.js'

/**
 * A connection represents a database connection created by instantiating
 * knex and its connections pool. In case of read/write replicas, two
 * knex instances will be created.
 */
export class Connection {
  /**
   * Shared with knex instances
   */
  #knexLogger: Knex.Logger

  #state: {
    closeErrorCallbacks: ((error: any, connection: Connection) => void)[]
    closeCallbacks: ((connection: Connection) => void)[]
    replicasConfig: any[]
    roundRobinCounter: number
  } = this.#createFreshState()

  /**
   * Reference to knex instance for executing write queries
   */
  client?: Knex

  /**
   * Read client when read/write replicas are defined in the config, otherwise
   * it is a reference to the "client".
   */
  readClient?: Knex

  /**
   * Dialect for which the connection is created
   */
  readonly dialectName: SupportedDialectNames

  /**
   * Client refers to the npm package used for connecting to
   * a given dialect
   */
  readonly clientName: string

  /**
   * A boolean to know if the read-write replicas have been configured
   * on the given connection
   */
  readonly hasReadWriteReplicas: boolean

  /**
   * @deprecated: Instead use "identifier"
   */
  get name() {
    return this.identifier
  }

  /**
   * Returns the pool instance for the given connection
   */
  get pool(): Pool<any> | null {
    return this.client?.client.pool ?? null
  }

  /**
   * Returns the pool instance for the read connection. When replicas are
   * not in use, then "pool" and "readPool" properties are the same.
   */
  get readPool(): Pool<any> | null {
    return this.readClient?.client.pool ?? null
  }

  /**
   * Returns a boolean indicating if the connection is ready for making
   * database queries. If not, one must call `connect`.
   */
  get ready(): boolean {
    return !!(this.client || this.readClient)
  }

  /**
   * Reference to the dialect implementation for the given connection
   */
  dialect: DialectContract

  constructor(
    /**
     * A unique connection identifier that is used to track the connection
     * by the connection manager
     */
    public identifier: string,
    public config: ConnectionConfig,
    logger?: ConnectionLogger
  ) {
    this.#validateConnectionSettings()
    this.clientName = config.clientName
    this.dialectName = config.dialectName
    this.hasReadWriteReplicas = !!config.replicas
    this.#setupWriteConnection()
    this.#setupReadConnection()
    this.#monitorPoolResources()
    this.#knexLogger = createKnexLogger(logger ?? console)
    this.dialect = new dialects[config.dialectName](this)
  }

  /**
   * Creates the fresh state for the connection
   */
  #createFreshState() {
    return {
      closeErrorCallbacks: [],
      closeCallbacks: [],
      replicasConfig: [],
      roundRobinCounter: 0,
    } satisfies {
      closeErrorCallbacks: ((error: any, connection: Connection) => void)[]
      closeCallbacks: ((connection: Connection) => void)[]
      replicasConfig: any[]
      roundRobinCounter: number
    }
  }

  /**
   * Validates the config to ensure that either the connection options
   * or the read-write replicas are provided.
   */
  #validateConnectionSettings() {
    /**
     * "connection" and "replicas" both are missing
     */
    if (!this.config.connection && !this.config.replicas) {
      throw new errors.E_INVALID_CONNECTION_CONFIG()
    }

    /**
     * One from read or write is missing
     */
    if (
      this.config.replicas &&
      (!this.config.replicas.read?.connection || !this.config.replicas.write?.connection)
    ) {
      throw new errors.E_INVALID_REPLICAS_CONFIG()
    }
  }

  /**
   * Creates the knex connection for write queries.
   */
  #setupWriteConnection() {
    const { replicas, connection, ...config } = this.config
    const writeConfig: Knex.Config = {
      ...config,
    }

    if (replicas && replicas.write) {
      /**
       * When connection or the write replica connection is a string, then we do not
       * perform any merging and use the "write.connection" directly.
       */
      if (typeof replicas.write.connection === 'string' || typeof connection === 'string') {
        writeConfig.connection = replicas.write.connection
      } else {
        /**
         * Otherwise we merge both the objects.
         */
        writeConfig.connection = { ...connection, ...replicas.write.connection }
      }
      /**
       * Use write replica pool settings when defined
       */
      if (replicas.write.pool) {
        writeConfig.pool = replicas.write.pool
      }
    } else {
      /**
       * No replicas in use
       */
      writeConfig.connection = connection
    }

    debug('%s: creating write connection %O', this.identifier, writeConfig)
    this.client = knex.knex({ log: this.#knexLogger, ...writeConfig })
    patchKnex(this.client, (originalConfig) => originalConfig.connection as Knex.ConnectionConfig)
  }

  /**
   * Creates the read connection. If there aren't any replicas in use, then
   * the read connection becomes a reference of the write connection
   */
  #setupReadConnection() {
    if (!this.hasReadWriteReplicas) {
      this.readClient = this.client
      return
    }

    const { replicas, connection, ...config } = this.config

    /**
     * The initial config is needed to setup the client and the
     * connection pool. The `database` property is needed to
     * avoid runtime checks of Knex.
     *
     * We read the database from the first node of read replica
     * or from the connection object.
     */
    const initialConfig: Knex.Config = {
      ...config,
      connection: {
        database: replicas!.read!.connection[0].database ?? connection?.database,
      },
    }

    /**
     * Override pool options to use the one's from the read replica (when defined)
     */
    if (replicas!.read.pool) {
      initialConfig.pool = replicas!.read.pool
    }

    debug('%s: creating read connection %O', this.identifier, initialConfig)
    this.readClient = knex({ log: this.#knexLogger, ...initialConfig })

    /**
     * Creating the final config array of read replicas.
     */
    this.#state.replicasConfig = replicas!.read.connection.map((one) => {
      if (typeof one === 'string' || typeof connection === 'string') {
        return one
      } else {
        return Object.assign({}, connection, one)
      }
    })

    patchKnex(this.readClient, (originalConfig) => {
      if (!this.#state.replicasConfig.length) {
        return originalConfig.connection
      }

      const index = this.#state.roundRobinCounter++ % this.#state.replicasConfig.length
      const readConfig = this.#state.replicasConfig[index]
      debug('%s: connecting to read host %O', readConfig)

      return readConfig
    })
  }

  /**
   * Does cleanup by removing knex reference and removing all listeners.
   * For the same of simplicity, we get rid of both read and write
   * clients, when anyone of them disconnects.
   */
  #monitorPoolResources(): void {
    /**
     * Pool has destroyed and hence we must cleanup resources
     * as well.
     */
    this.pool!.on('poolDestroySuccess', () => {
      debug('%s: write pool destroyed, cleaning up resource', this.identifier)
      if (this.client === this.readClient) {
        this.readClient = undefined
      }
      this.pool!.removeAllListeners()
      this.client = undefined
      this.#state.closeCallbacks.forEach((callback) => callback(this))
      this.#state = this.#createFreshState()
    })

    if (this.readPool !== this.pool) {
      this.readPool!.on('poolDestroySuccess', () => {
        debug('%s: read pool destroyed, cleaning up resource', this.identifier)
        this.readPool!.removeAllListeners()
        this.readClient = undefined
      })
    }
  }

  /**
   * Define a callback to get notified when the connection has been destroyed
   * by the pool.
   *
   * The `onClose` callback is called only for the write connection after the
   * pool destroys all the connections.
   */
  onClose(callback: (connection: Connection) => void) {
    this.#state.closeCallbacks.push(callback)
    return this
  }

  /**
   * Define a callback to get notified when unable to close the connection
   * because of an error. However, the knex instances will still be
   * destroyed and the "Connection" instance won't be usable.
   */
  onCloseError(callback: (error: any, connection: Connection) => void) {
    this.#state.closeErrorCallbacks.push(callback)
    return this
  }

  /**
   * Returns reference to the knex client to be used for
   * making write queries.
   *
   * An exception is thrown when the connection has been closed
   * and no client exists.
   *
   * @note
   * Avoid using Knex directly and instead use the {@link QueryClient} and
   * {@link AbstractQueryBuilder} offered by Lucid
   */
  getWriteClient(): Knex {
    if (!this.client) {
      throw new RuntimeException(
        'Cannot access connection client. Connection has already been closed'
      )
    }
    return this.client
  }

  /**
   * Returns reference to the knex client to be used for
   * making read queries.
   *
   * An exception is thrown when the connection has been closed
   * and no client exists.
   *
   * @note
   * Avoid using Knex directly and instead use the {@link QueryClient} and
   * {@link AbstractQueryBuilder} offered by Lucid
   */
  getReadClient(): Knex {
    if (!this.readClient) {
      throw new RuntimeException(
        'Cannot access connection client. Connection has already been closed'
      )
    }
    return this.readClient
  }

  /**
   * Returns the query client for the current connection. A query client can be
   * created in one of the following modes.
   *
   * - dual: In dual mode, the query client will send SELECT queries to the
   *   `read` connection and all other queries to the `write` connection.
   * - write: In write mode, all queries will be sent to the `write` connection.
   * - read: Whereas, in read mode the write queries are disallowed.
   *
   * @default: 'dual'
   */
  getQueryClient(mode: 'dual' | 'write' | 'read' = 'dual') {
    return new QueryClient(this, mode)
  }

  /**
   * Closes the DB connection by destroying the knex instances.
   */
  async close(): Promise<void> {
    debug('%s: closing connection', this.identifier)

    /**
     * Disconnect write client
     */
    if (this.client) {
      try {
        await this.client.destroy()
      } catch (error) {
        this.#state.closeErrorCallbacks.forEach((callback) => callback(error, this))
        throw error
      }
    }

    /**
     * Disconnect read client when it exists and both clients
     * aren't same
     */
    if (this.readClient && this.readClient !== this.client) {
      await this.readClient.destroy()
    }
  }
}
