/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="./querybuilder.ts" />

declare module '@ioc:Adonis/Lucid/Database' {
  import knex from 'knex'
  import { Pool } from 'tarn'
  import { EventEmitter } from 'events'
  import { Dictionary } from 'ts-essentials'
  import { ProfilerRowContract, ProfilerContract } from '@ioc:Adonis/Core/Profiler'

  import {
    RawContract,
    DatabaseQueryBuilderContract,
    InsertQueryBuilderContract,
    StrictValuesWithoutRaw,
    SelectTable,
    Table,
  } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

  /**
   * A executable query builder will always have these methods on it.
   */
  export interface ExcutableQueryBuilderContract<Result extends any> extends Promise<Result> {
    debug (debug: boolean): this
    timeout (time: number, options?: { cancel: boolean }): this
    useTransaction (trx: TransactionClientContract): this
    toQuery (): string
    exec (): Promise<Result>
    toSQL (): knex.Sql
  }

  /**
   * Shape of the query client, that is used to retrive instances
   * of query builder
   */
  export interface QueryClientContract {
    /**
     * Custom profiler to time queries
     */
    profiler?: ProfilerRowContract | ProfilerContract

    /**
     * Tells if client is a transaction client or not
     */
    isTransaction: boolean

    /**
     * The database dialect in use
     */
    dialect: string

    /**
     * The client mode in which it is execute queries
     */
    mode: 'dual' | 'write' | 'read'

    /**
     * The name of the connnection from which the client
     * was originated
     */
    connectionName: string

    /**
     * Returns the read and write clients
     */
    getReadClient (): knex<any, any> | knex.Transaction<any, any>
    getWriteClient (): knex<any, any> | knex.Transaction<any, any>

    /**
     * Get new query builder instance for select, update and
     * delete calls
     */
    query<
      Record extends any = any,
      Result extends any = Record,
    > (): DatabaseQueryBuilderContract<Record, Result> & ExcutableQueryBuilderContract<Result>,

    /**
     * Get new query builder instance inserts
     */
    insertQuery<
      Record extends any = any,
      ReturnColumns extends any = Record
    > (
    ): InsertQueryBuilderContract<Record, ReturnColumns[]> & ExcutableQueryBuilderContract<ReturnColumns[]>,

    /**
     * Get raw query builder instance
     */
    raw<
      Result extends any = any
    > (
      sql: string,
      bindings?: { [key: string]: StrictValuesWithoutRaw } | StrictValuesWithoutRaw,
    ): RawContract & ExcutableQueryBuilderContract<Result>

    /**
     * Truncate a given table
     */
    truncate (table: string): Promise<void>,

    /**
     * Returns columns info for a given table
     */
    columnsInfo (table: string): Promise<{ [column: string]: knex.ColumnInfo }>,
    columnsInfo (table: string, column: string): Promise<knex.ColumnInfo>,

    /**
     * Same as `query()`, but also selects the table for the query. The `from` method
     * doesn't allow defining the return type and one must use `query` to define
     * that.
     */
    from: SelectTable<DatabaseQueryBuilderContract & ExcutableQueryBuilderContract<any>>,

    /**
     * Same as `insertQuery()`, but also selects the table for the query. The `table`
     * method doesn't allow defining the return type and one must use `insertQuery`
     * to define that.
     */
    table: Table<InsertQueryBuilderContract & ExcutableQueryBuilderContract<any>>,

    /**
     * Get instance of transaction client
     */
    transaction (): Promise<TransactionClientContract>,
  }

  /**
   * The shape of transaction client to run queries under a given
   * transaction on a single connection
   */
  export interface TransactionClientContract extends QueryClientContract {
    knexClient: knex.Transaction,

    /**
     * Is transaction completed or not
     */
    isCompleted: boolean,

    /**
     * Commit transaction
     */
    commit (): Promise<void>,

    /**
     * Rollback transaction
     */
    rollback (): Promise<void>
  }

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

    /**
     * Property to find if explicit read/write is enabled
     */
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
   * Options when retrieving new query client from the database
   * query builder
   */
  export type DatabaseClientOptions = Partial<{
    mode: 'read' | 'write',
    profiler: ProfilerRowContract | ProfilerContract,
  }>

  /**
   * Database contract serves as the main API to interact with multiple
   * database connections
   */
  export interface DatabaseContract {
    /**
     * Name of the primary connection defined inside `config/database.ts`
     * file
     */
    primaryConnectionName: string,

    /**
     * Reference to the connection manager
     */
    manager: ConnectionManagerContract,

    /**
     * Returns the raw connection instance
     */
    getRawConnection: ConnectionManagerContract['get'],

    /**
     * Get query client for a given connection. Optionally one can also define
     * the mode of the connection and profiler row
     */
    connection (connectionName?: string, options?: DatabaseClientOptions): QueryClientContract

    /**
     * Get query builder instance for a given connection.
     */
    query<
      Record extends any = any,
      Result extends any = Record,
    > (
      options?: DatabaseClientOptions,
    ): DatabaseQueryBuilderContract<Record, Result> & ExcutableQueryBuilderContract<Result>,

    /**
     * Get insert query builder instance for a given connection.
     */
    insertQuery<
      Record extends any = any,
      ReturnColumns extends any = Record
    > (
      options?: DatabaseClientOptions,
    ): InsertQueryBuilderContract<Record, ReturnColumns[]> & ExcutableQueryBuilderContract<ReturnColumns[]>,

    /**
     * Get raw query builder instance
     */
    raw<
      Result extends any = any
    > (
      sql: string,
      bindings?: { [key: string]: StrictValuesWithoutRaw } | StrictValuesWithoutRaw[],
      options?: DatabaseClientOptions,
    ): RawContract & ExcutableQueryBuilderContract<Result>

    /**
     * Selects a table on the default connection by instantiating a new query
     * builder instance. This method provides no control over the client
     * mode and one must use `query` for that
     */
    from: QueryClientContract['from']

    /**
     * Selects a table on the default connection by instantiating a new query
     * builder instance. This method provides no control over the client
     * mode and one must use `insertQuery` for that
     */
    table: QueryClientContract['table']

    /**
     * Start a new transaction
     */
    transaction (): Promise<TransactionClientContract>
  }

  const Database: DatabaseContract
  export default Database
}
