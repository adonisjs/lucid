/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Pool } from 'tarn'
import { knex, type Knex } from 'knex'
import { EventEmitter } from 'node:events'
import { patchKnex } from 'knex-dynamic-connection'
import type { Logger } from '@adonisjs/core/logger'
// @ts-expect-error
import { resolveClientNameWithAliases } from 'knex/lib/util/helpers.js'

import * as errors from '../errors.js'
import LibSQLClient from '../clients/libsql.cjs'
import { clientsNames } from '../dialects/index.js'
import { Logger as ConnectionLogger } from './logger.js'
import { patchKnexSqliteForeignKeyCheck } from '../patches/knex_sqlite_foreign_key_check.js'
import type { ConnectionConfig, ConnectionContract } from '../types/database.js'

/**
 * A Knex config variant where `connection` is typed as `any`. Used internally
 * by `getWriteConfig` / `getReadConfig` so that resolver functions and `{}`
 * placeholders can be assigned without type assertions. The type is still
 * structurally assignable to `Knex.Config` because `any` satisfies every type.
 */
type KnexRawConfig = Omit<Knex.Config, 'connection'> & { connection?: any }

/**
 * Apply knex SQLite foreign key check patch
 */
await patchKnexSqliteForeignKeyCheck()

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
   * Write replica connection resolver function when replicas are defined and
   * the write connection is a function. Populated by `getWriteConfig`.
   */
  private writeReplicaResolver: (() => any) | null = null

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
   * Cleans up reference for the write client and also the
   * read client when not using replicas
   */
  private cleanupWriteClient() {
    if (this.client === this.readClient) {
      this.cleanupReadClient()
    }
    this.client = undefined
  }

  /**
   * Cleans up reference for the read client
   */
  private cleanupReadClient() {
    this.roundRobinCounter = 0
    this.readClient = undefined
    this.readReplicas = []
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
      this.cleanupWriteClient()
      this.emit('disconnect', this)
      this.removeAllListeners()
    })

    if (this.readPool !== this.pool) {
      this.readPool!.on('poolDestroySuccess', () => {
        this.logger.trace({ connection: this.name }, 'pool destroyed, cleaning up resource')
        this.cleanupReadClient()
        this.emit('disconnect', this)
        this.removeAllListeners()
      })
    }
  }

  /**
   * Returns normalized config object for write replica to be
   * used by knex.
   *
   * When `connection` is a function resolver, an empty placeholder is used for
   * the initial knex setup. The `writeConfigResolver` is responsible for
   * calling the function on each connection acquisition.
   */
  private getWriteConfig(): KnexRawConfig {
    if (!this.config.replicas) {
      /**
       * Replacing string based libsql client with the
       * actual implementation
       */
      if (this.config.client === 'libsql') {
        return {
          ...this.config,
          ...(typeof this.config.connection === 'function' ? { connection: {} } : {}),
          client: LibSQLClient,
        }
      }

      /**
       * When connection is a function resolver, substitute an empty placeholder
       * so that Knex can initialise cleanly. The resolver is patched in via
       * patchKnex and provides the real config on each acquisition.
       */
      if (typeof this.config.connection === 'function') {
        return { ...this.config, connection: {} }
      }

      return { ...this.config }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { replicas, ...config } = this.config as any

    /**
     * Give preference to the replica write connection when and merge values from
     * the main connection object when defined.
     *
     * When the connection is a function resolver, store it in `writeReplicaResolver`
     * and use an empty placeholder for the initial Knex config. The resolver is
     * invoked on each connection acquisition via `writeConfigResolver`.
     */
    if (
      typeof replicas.write.connection === 'function' ||
      typeof config.connection === 'function'
    ) {
      this.writeReplicaResolver = replicas.write.connection ?? config.connection
      config.connection = {}
    } else if (
      typeof replicas.write.connection === 'string' ||
      typeof config.connection === 'string'
    ) {
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

    return config
  }

  /**
   * Returns the config for read replicas.
   */
  private getReadConfig(): KnexRawConfig {
    if (!this.config.replicas) {
      if (typeof this.config.connection === 'function') {
        return { ...this.config, connection: {} }
      }

      return { ...this.config }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { replicas, ...config } = this.config as any

    /**
     * Reading replicas and storing them as a reference, so that we
     * can pick a config from replicas as round robin.
     *
     * When the connection is a function resolver, store it so the
     * readConfigResolver can call it on each connection acquisition.
     */
    this.readReplicas = (replicas.read.connection as Array<any>).map((one: any) => {
      if (typeof one === 'function') {
        return one
      } else if (typeof one === 'string' || typeof config.connection === 'string') {
        return one
      } else {
        return Object.assign({}, config.connection, one)
      }
    })

    /**
     * Add database property on the main connection, since knexjs needs it
     * internally. When the first replica is a function resolver, use an empty
     * placeholder since the resolver provides the real config per-acquisition.
     */
    if (typeof this.readReplicas[0] === 'function') {
      config.connection = {}
    } else {
      config.connection = {
        database: this.readReplicas[0].database,
      }
    }

    /**
     * Add pool to the config when pool config defined on main connection
     * or the read replica
     */
    if (config.pool || replicas.read.pool) {
      config.pool = Object.assign({}, config.pool, replicas.read.pool)
    }

    return config
  }

  /**
   * Resolves connection config for the writer connection.
   * When `connection` is a function resolver, it is called to support dynamic
   * credentials (e.g. short-lived IAM tokens that must be refreshed).
   */
  private writeConfigResolver(_originalConfig: ConnectionConfig) {
    if (this.writeReplicaResolver) {
      return this.writeReplicaResolver()
    }
    if (typeof this.config.connection === 'function') {
      return this.config.connection()
    }
    return this.config.connection
  }

  /**
   * Resolves connection config for the reader connection.
   * When the connection or a stored read replica entry is a function resolver,
   * it is called to support dynamic credentials.
   */
  private readConfigResolver(_originalConfig: ConnectionConfig) {
    if (!this.readReplicas.length) {
      if (typeof this.config.connection === 'function') {
        return this.config.connection()
      }
      return this.config.connection
    }

    const index = this.roundRobinCounter++ % this.readReplicas.length
    this.logger.trace({ connection: this.name }, `round robin using host at ${index} index`)
    const replica = this.readReplicas[index]
    if (typeof replica === 'function') {
      return replica()
    }
    return replica
  }

  /**
   * Re-patches the `acquireRawConnection` method on the given knex client so
   * that `getRuntimeConnectionSettings` is always awaited. This is necessary
   * when the connection is an async function resolver, because
   * `knex-dynamic-connection` calls `getRuntimeConnectionSettings` synchronously.
   *
   * `Promise.resolve(settings)` is safe for both sync and async resolvers:
   * a plain object passes through unchanged; a Promise is awaited.
   *
   * Supported dialects: pg / postgres / redshift, mysql / mysql2.
   * MSSQL support can be added when needed.
   */
  private patchForAsyncResolver(knexClient: Knex): void {
    const client = knexClient.client

    switch (this.clientName) {
      case 'postgres':
        client.acquireRawConnection = function acquireRawConnection(this: any) {
          const self = this
          return Promise.resolve(this.getRuntimeConnectionSettings()).then((settings: any) => {
            const connection = new self.driver.Client(settings)
            connection.on('error', (err: any) => {
              connection.__knex__disposed = err
            })
            connection.on('end', (err: any) => {
              connection.__knex__disposed = err || 'Connection ended unexpectedly'
            })
            return connection
              .connect()
              .then(() => {
                if (!self.version) {
                  return self.checkVersion(connection).then((version: string) => {
                    self.version = version
                    return connection
                  })
                }
                return connection
              })
              .then((conn: any) => {
                self.setSchemaSearchPath(conn)
                return conn
              })
          })
        }
        break

      case 'mysql':
      case 'mysql2':
        client.acquireRawConnection = function acquireRawConnection(this: any) {
          const self = this
          return Promise.resolve(this.getRuntimeConnectionSettings()).then(
            (settings: any) =>
              new Promise((resolve, reject) => {
                const connection = self.driver.createConnection(settings)
                connection.on('error', (err: any) => {
                  connection.__knex__disposed = err
                })
                connection.connect((err: any) => {
                  if (err) {
                    connection.removeAllListeners()
                    return reject(err)
                  }
                  resolve(connection)
                })
              })
          )
        }
        break
    }
  }

  /**
   * Creates the write connection.
   */
  private setupWriteConnection() {
    this.client = knex(
      Object.assign({ log: new ConnectionLogger(this.name, this.logger) }, this.getWriteConfig(), {
        debug: false,
      })
    )

    // @ts-ignore
    patchKnex(this.client, this.writeConfigResolver.bind(this))

    if (typeof this.config.connection === 'function' || this.writeReplicaResolver) {
      this.patchForAsyncResolver(this.client)
    }
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
    this.readClient = knex(
      Object.assign({ log: new ConnectionLogger(this.name, this.logger) }, this.getReadConfig(), {
        debug: false,
      })
    )

    // @ts-ignore
    patchKnex(this.readClient, this.readConfigResolver.bind(this))

    if (
      typeof this.config.connection === 'function' ||
      this.readReplicas.some((r) => typeof r === 'function')
    ) {
      this.patchForAsyncResolver(this.readClient)
    }
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
