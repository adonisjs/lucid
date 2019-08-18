/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="./querybuilder.ts" />

declare module '@ioc:Adonis/Addons/Database' {
  import { Pool } from 'tarn'
  import * as knex from 'knex'
  import { EventEmitter } from 'events'

  import {
    RawContract,
    RawBuilderContract,
    QueryClientContract,
    TransactionClientContract,
    InsertQueryBuilderContract,
    DatabaseQueryBuilderContract,
  } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

  /**
   * Connection node used by majority of database
   * clients
   */
  type SharedConnectionNode = {
    host?: string,
    user?: string,
    password?: string,
    database?: string,
    port?: number,
  }

  /**
   * Shared config options for all clients
   */
  type SharedConfigNode = {
    useNullAsDefault?: boolean,
    debug?: boolean,
    asyncStackTraces?: boolean,
    pool?: {
      afterCreate?: (conn: any, done: any) => void,
      min?: number,
      max?: number,
      acquireTimeoutMillis?: number,
      createTimeoutMillis?: number,
      idleTimeoutMillis?: number,
      createRetryIntervalMillis?: number,
      reapIntervalMillis?: number,
      log?: (msg: string) => any,
      validate?: (resource: any) => boolean,
      propagateCreateError?: boolean,
    },
  }

  /**
   * The Sqlite specific config options are taken directly from the
   * driver. https://github.com/mapbox/node-sqlite3/wiki/API#new-sqlite3databasefilename-mode-callback
   *
   * Knex forwards all config options to the driver directly. So feel
   * free to define them (let us know, in case any options are missing)
   */
  export type SqliteConfigContract = SharedConfigNode & {
    client: 'sqlite' | 'sqlite3',
    connection: {
      filename: string,
      mode?: any,
    },
    replicas?: never,
  }

  /**
   * The MYSQL specific config options are taken directly from the
   * driver. https://www.npmjs.com/package/mysql#connection-options
   *
   * Knex forwards all config options to the driver directly. So feel
   * free to define them (let us know, in case any options are missing)
   */
  type MysqlConnectionNode = {
    socketPath?: string,
    localAddress?: string,
    charset?: string,
    timezone?: string,
    stringifyObjects?: boolean,
    insecureAuth?: boolean,
    typeCast?: boolean,
    supportBigNumbers?: boolean,
    bigNumberStrings?: boolean,
    dateStrings?: boolean | string[],
    flags?: string,
    ssl?: any,
  }

  export type MysqlConfigContract = SharedConfigNode & {
    client: 'mysql',
    version?: string,
    connection?: SharedConnectionNode & MysqlConnectionNode,
    replicas?: {
      write: {
        connection: MysqlConfigContract['connection'],
        pool?: MysqlConfigContract['pool'],
      }
      read: {
        connection: MysqlConfigContract['connection'][],
        pool?: MysqlConfigContract['pool'],
      },
    },
  }

  /**
   * `mysql2` config is same as `mysql`. So just refer mysql docs
   * https://www.npmjs.com/package/mysql#connection-options
   *
   * Knex forwards all config options to the driver directly. So feel
   * free to define them (let us know, in case any options are missing)
   */
  export type Mysql2ConfigContract = MysqlConfigContract & {
    client: 'mysql2',
  }

  /**
   * Config is picked from PostgreSQL driver, just refer their docs
   * https://node-postgres.com/features/connecting#programmatic.
   *
   * - `returning` is added by knex and not driver.
   * - `searchPath` is also added by knex.
   *
   * Knex forwards all config options to the driver directly. So feel
   * free to define them (let us know, in case any options are missing)
   */
  export type PostgreConfigContract = SharedConfigNode & {
    client: 'pg' | 'postgres' | 'postgresql',
    version?: string,
    returning?: string,
    connection?: string | SharedConnectionNode,
    replicas?: {
      write: {
        connection: PostgreConfigContract['connection'],
        pool?: PostgreConfigContract['pool'],
      }
      read: {
        connection: PostgreConfigContract['connection'][],
        pool?: PostgreConfigContract['pool'],
      },
    },
    searchPath?: string[],
  }

  /**
   * Redshift uses `pg` driver. So config options are same as Postgres.
   * https://node-postgres.com/features/connecting#programmatic.
   *
   * Knex forwards all config options to the driver directly. So feel
   * free to define them (let us know, in case any options are missing)
   */
  export type RedshiftConfigContract = PostgreConfigContract & {
    client: 'redshift',
  }

  /**
   * Please install `oracledb` driver and not the `oracle`. The later is
   * depreciated. Config is only allowed for `oracledb`.
   *
   * Please refer to the driver configuration docs to learn more about the
   * config values.
   * https://oracle.github.io/node-oracledb/doc/api.html#oracledbproperties
   */
  type OracleConnectionNode = {
    autoCommit?: boolean,
    connectionClass?: string,
    edition?: string,
    externalAuth?: boolean,
    fetchArraySize?: number,
    fetchAsBuffer?: any[],
    lobPrefetchSize?: number,
    maxRows?: number,
    oracleClientVersion?: number,
  }

  export type OracleConfigContract = SharedConfigNode & {
    client: 'oracledb',
    connection?: SharedConnectionNode & OracleConnectionNode,
    replicas?: {
      write: {
        connection: OracleConfigContract['connection'],
        pool?: OracleConfigContract['pool'],
      }
      read: {
        connection: OracleConfigContract['connection'][],
        pool?: OracleConfigContract['pool'],
      },
    },
    fetchAsString?: any[],
  }

  /**
   * Config values are taken directly from the driver config.
   * https://www.npmjs.com/package/mssql#config.
   *
   * Knex forwards all config options to the driver directly. So feel
   * free to define them (let us know, in case any options are missing)
   */
  type MssqlConnectionNode = {
    domain?: string,
    connectionTimeout?: number,
    requestTimeout?: number,
    parseJSON?: boolean,
  }

  export type MssqlConfigContract = SharedConfigNode & {
    client: 'mssql',
    version?: string,
    connection?: SharedConnectionNode & MssqlConnectionNode,
    replicas?: {
      write: {
        connection: MssqlConfigContract['connection'],
        pool?: MssqlConfigContract['pool'],
      }
      read: {
        connection: MssqlConfigContract['connection'][],
        pool?: MssqlConfigContract['pool'],
      },
    },
  }

  /**
   * Connection config must be the config from one of the
   * available dialects
   */
  export type ConnectionConfigContract =
    SqliteConfigContract |
    MysqlConfigContract |
    PostgreConfigContract |
    OracleConfigContract |
    RedshiftConfigContract |
    Mysql2ConfigContract |
    MssqlConfigContract

  /**
   * Shape of config inside the database config file
   */
  export type DatabaseConfigContract = {
    connection: string,
    connections: { [key: string]: ConnectionConfigContract },
  }

  /**
   * The shape of a connection within the connection manager
   */
  type ConnectionManagerConnectionNode = {
    name: string,
    config: ConnectionConfigContract,
    connection?: ConnectionContract,
    state: 'idle' | 'open' | 'closed',
  }

  /**
   * Connection manager to manage one or more database
   * connections.
   */
  export interface ConnectionManagerContract extends EventEmitter {
    /**
     * List of registered connection. You must check the connection state
     * to understand, if it is connected or not
     */
    connections: Map<string, ConnectionManagerConnectionNode>

    /**
     * Everytime a connection is created
     */
    on (event: 'connect', callback: (connection: ConnectionContract) => void): this

    /**
     * Everytime a connection leaves
     */
    on (event: 'disconnect', callback: (connection: ConnectionContract) => void): this

    /**
     * When error is received on a given connection
     */
    on (event: 'error', callback: (connection: ConnectionContract, error: Error) => void): this

    /**
     * Add a new connection to the list of managed connection. You must call
     * connect seperately to instantiate a connection instance
     */
    add (connectionName: string, config: ConnectionConfigContract): void

    /**
     * Instantiate a connection. It is a noop, when connection for the given
     * name is already instantiated
     */
    connect (connectionName: string): void

    /**
     * Get connection node
     */
    get (connectionName: string): ConnectionManagerConnectionNode | undefined

    /**
     * Find if a connection name is managed by the manager or not
     */
    has (connectionName: string): boolean

    /**
     * Find if a managed connection is instantiated or not
     */
    isConnected (connectionName: string): boolean

    /**
     * Close a given connection. This is also kill the underlying knex connection
     * pool
     */
    close (connectionName: string, release?: boolean): Promise<void>

    /**
     * Close all managed connections
     */
    closeAll (release?: boolean): Promise<void>

    /**
     * Release a given connection. Releasing a connection means, you will have to
     * re-add it using the `add` method
     */
    release (connectionName: string): Promise<void>
  }

  /**
   * Connection represents a single knex instance with inbuilt
   * pooling capabilities.
   */
  export interface ConnectionContract extends EventEmitter {
    client?: knex,
    readClient?: knex,

    hasReadWriteReplicas: boolean,

    /**
     * Read/write connection pools
     */
    pool: null | Pool<any>,
    readPool: null | Pool<any>,

    /**
     * Name of the connection
     */
    name: string,

    /**
     * Untouched config
     */
    config: ConnectionConfigContract,

    /**
     * List of emitted events
     */
    on (event: 'connect', callback: (connection: ConnectionContract) => void): this
    on (event: 'error', callback: (connection: ConnectionContract, error: Error) => void): this
    on (event: 'disconnect', callback: (connection: ConnectionContract) => void): this
    on (event: 'disconnect:error', callback: (connection: ConnectionContract, error: Error) => void): this

    /**
     * Make knex connection
     */
    connect (): void,

    /**
     * Disconnect knex
     */
    disconnect (): Promise<void>,

    /**
     * Returns an instance of a given client. A sticky client
     * always uses the write connection for all queries
     */
    getClient (mode?: 'write' | 'read'): QueryClientContract,
  }

  /**
   * Database contract serves as the main API to interact with multiple
   * database connections
   */
  export interface DatabaseContract {
    primaryConnectionName: string,
    getRawConnection: ConnectionManagerContract['get']
    manager: ConnectionManagerContract,

    connection (connectionName: string): QueryClientContract
    query (mode?: 'read' | 'write'): DatabaseQueryBuilderContract
    insertQuery (): InsertQueryBuilderContract
    from (table: string): DatabaseQueryBuilderContract
    table (table: string): InsertQueryBuilderContract
    transaction (): Promise<TransactionClientContract>
    raw (sql: string, bindings?: any, mode?: 'read' | 'write'): RawContract
  }
}
