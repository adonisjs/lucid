/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import type { Pool } from 'tarn'
import type { EventEmitter } from 'node:events'
import type { ConnectionOptions } from 'node:tls'
import type { Emitter } from '@adonisjs/core/events'
import { LucidModel, ModelQueryBuilderContract } from './model.js'
import {
  DatabaseQueryBuilderContract,
  FromTable,
  InsertQueryBuilderContract,
  RawBuilderContract,
  RawQueryBindings,
  RawQueryBuilderContract,
  ReferenceBuilderContract,
} from './querybuilder.js'

/**
 * Same as knex. Need to redefine, as knex doesn't export this
 * type
 */
export type IsolationLevels =
  | 'read uncommitted'
  | 'read committed'
  | 'snapshot'
  | 'repeatable read'
  | 'serializable'

/**
 * Migration node returned by the migration source
 * implementation
 */
export type FileNode<T> = {
  absPath: string
  name: string
  getSource: () => T | Promise<T>
}

/**
 * Dialect specific methods
 */
export interface DialectContract {
  readonly name:
    | 'mssql'
    | 'mysql'
    | 'oracledb'
    | 'postgres'
    | 'redshift'
    | 'sqlite3'
    | 'better-sqlite3'
  readonly dateTimeFormat: string

  readonly version?: string
  readonly supportsAdvisoryLocks: boolean
  readonly supportsViews: boolean
  readonly supportsTypes: boolean
  readonly supportsDomains: boolean
  readonly supportsReturningStatement: boolean

  getAllTables(schemas?: string[]): Promise<string[]>
  dropAllTables(schemas?: string[]): Promise<void>

  getAllViews(schemas?: string[]): Promise<string[]>
  dropAllViews(schemas?: string[]): Promise<void>

  getAllTypes(schemas?: string[]): Promise<string[]>
  dropAllTypes(schemas?: string[]): Promise<void>

  getAllDomains(schemas?: string[]): Promise<string[]>
  dropAllDomains(schemas?: string[]): Promise<void>

  truncate(table: string, cascade?: boolean): Promise<void>

  getAdvisoryLock(key: string | number, timeout?: number): Promise<boolean>
  releaseAdvisoryLock(key: string | number): Promise<boolean>
}

/**
 * Shape of the transaction function to create a new transaction
 */
export interface TransactionFn {
  <T>(
    callback: (trx: TransactionClientContract) => Promise<T>,
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<T>
  (options?: { isolationLevel?: IsolationLevels }): Promise<TransactionClientContract>
}

/**
 * Shape of the query client, that is used to retrive instances
 * of query builder
 */
export interface QueryClientContract {
  emitter: Emitter<any>

  /**
   * Tells if client is a transaction client or not
   */
  readonly isTransaction: boolean

  /**
   * The database dialect in use
   */
  readonly dialect: DialectContract

  /**
   * The client mode in which it is execute queries
   */
  readonly mode: 'dual' | 'write' | 'read'

  /**
   * The name of the connnection from which the client
   * was originated
   */
  readonly connectionName: string

  /**
   * Is debug enabled on the connnection or not. Also opens up the API to
   * disable debug for a given client
   */
  debug: boolean

  /**
   * Returns schema instance for the write client
   */
  schema: Knex.SchemaBuilder

  /**
   * Returns the read and write clients
   */
  getReadClient(): Knex<any, any>
  getWriteClient(): Knex<any, any>

  /**
   * Returns the query builder for a given model
   */
  modelQuery<T extends LucidModel, Result = T>(model: T): ModelQueryBuilderContract<T, Result>

  /**
   * Returns the knex query builder instance
   */
  knexQuery(): Knex.QueryBuilder

  /**
   * Returns the knex raw query builder instance
   */
  knexRawQuery(sql: string, bindings?: RawQueryBindings): Knex.Raw

  /**
   * Get new query builder instance for select, update and
   * delete calls
   */
  query<Result = any>(): DatabaseQueryBuilderContract<Result>

  /**
   * Get new query builder instance inserts
   */
  insertQuery<ReturnColumns = any>(): InsertQueryBuilderContract<ReturnColumns[]>

  /**
   * Get raw query builder instance
   */
  rawQuery<Result = any>(sql: string, bindings?: RawQueryBindings): RawQueryBuilderContract<Result>

  /**
   * Returns instance of reference builder
   */
  ref(reference: string): ReferenceBuilderContract

  /**
   * Returns instance of raw builder
   */
  raw(sql: string, bindings?: RawQueryBindings): RawBuilderContract

  /**
   * Truncate a given table
   */
  truncate(table: string, cascade?: boolean): Promise<void>

  /**
   * Returns columns info for a given table
   */
  columnsInfo(table: string): Promise<{ [column: string]: Knex.ColumnInfo }>
  columnsInfo(table: string, column: string): Promise<Knex.ColumnInfo>

  /**
   * Get all tables of the database
   */
  getAllTables(schemas?: string[]): Promise<string[]>

  /**
   * Returns an array of all views names for one or many schemas
   */
  getAllViews(schemas?: string[]): Promise<string[]>

  /**
   * Returns an array of all types names
   */
  getAllTypes(schemas?: string[]): Promise<string[]>

  /**
   * Returns an array of all domain names
   */
  getAllDomains(schemas?: string[]): Promise<string[]>

  /**
   * Drop all tables inside database
   */
  dropAllTables(schemas?: string[]): Promise<void>

  /**
   * Drop all views inside the database
   */
  dropAllViews(schemas?: string[]): Promise<void>

  /**
   * Drop all types inside the database
   */
  dropAllTypes(schemas?: string[]): Promise<void>

  /**
   * Drop all domains inside the database
   */
  dropAllDomains(schemas?: string[]): Promise<void>

  /**
   * Same as `query()`, but also selects the table for the query. The `from` method
   * doesn't allow defining the return type and one must use `query` to define
   * that.
   */
  from: FromTable<DatabaseQueryBuilderContract<any>>

  /**
   * Same as `insertQuery()`, but also selects the table for the query.
   * The `table` method doesn't allow defining the return type and
   * one must use `insertQuery` to define that.
   */
  table: <ReturnColumns = any>(table: string) => InsertQueryBuilderContract<ReturnColumns[]>

  /**
   * Get instance of transaction client
   */
  transaction: TransactionFn

  /**
   * Work with advisory locks
   */
  getAdvisoryLock(key: string | number, timeout?: number): Promise<boolean>
  releaseAdvisoryLock(key: string | number): Promise<boolean>
}

/**
 * The shape of transaction client to run queries under a given
 * transaction on a single connection
 */
export interface TransactionClientContract extends QueryClientContract, EventEmitter {
  knexClient: Knex.Transaction

  /**
   * Is transaction completed or not
   */
  isCompleted: boolean

  /**
   * Commit transaction
   */
  commit(): Promise<void>

  /**
   * Rollback transaction
   */
  rollback(): Promise<void>

  /**
   * Returns the read and write transaction clients
   */
  getReadClient(): Knex.Transaction<any, any>
  getWriteClient(): Knex.Transaction<any, any>

  /**
   * Transaction named events
   */
  on(event: 'commit', handler: (client: this) => void): this
  on(event: 'rollback', handler: (client: this) => void): this

  once(event: 'commit', handler: (client: this) => void): this
  once(event: 'rollback', handler: (client: this) => void): this

  after(event: 'rollback' | 'commit', handler: () => void | Promise<void>): this
}

/**
 * Connection node used by majority of database
 * clients
 */
type SharedConnectionNode = {
  host?: string
  user?: string
  password?: string
  database?: string
  port?: number
}

/**
 * Shape of the report node for the database connection report
 */
export type ReportNode = {
  connection: string
  message: string
  error: any
}

/**
 * Migrations config
 */
export type MigratorConfig = {
  disableTransactions?: boolean
  paths?: string[]
  tableName?: string
  disableRollbacksInProduction?: boolean
  naturalSort?: boolean
}

/**
 * Seeders config
 */
export type SeedersConfig = {
  paths: string[]
}

/**
 * Shared config options for all clients
 */
export type SharedConfigNode = {
  useNullAsDefault?: boolean
  debug?: boolean
  asyncStackTraces?: boolean
  revision?: number
  healthCheck?: boolean
  migrations?: MigratorConfig
  seeders?: SeedersConfig
  wipe?: { ignoreTables?: string[] }
  pool?: {
    afterCreate?: (conn: any, done: any) => void
    min?: number
    max?: number
    acquireTimeoutMillis?: number
    createTimeoutMillis?: number
    idleTimeoutMillis?: number
    createRetryIntervalMillis?: number
    reapIntervalMillis?: number
    log?: (msg: string) => any
    validate?: (resource: any) => boolean
    propagateCreateError?: boolean
  }
}

/**
 * The Sqlite specific config options are taken directly from the
 * driver. https://github.com/mapbox/node-sqlite3/wiki/API#new-sqlite3databasefilename-mode-callback
 *
 * Knex forwards all config options to the driver directly. So feel
 * free to define them (let us know, in case any options are missing)
 */
export type SqliteConfig = SharedConfigNode & {
  client: 'sqlite' | 'sqlite3' | 'better-sqlite3'
  connection: {
    filename: string
    flags?: string[]
    debug?: boolean
    mode?: any
  }
  replicas?: never
}

/**
 * The MYSQL specific config options are taken directly from the
 * driver. https://www.npmjs.com/package/mysql#connection-options
 *
 * Knex forwards all config options to the driver directly. So feel
 * free to define them (let us know, in case any options are missing)
 */
type MysqlConnectionNode = {
  socketPath?: string
  localAddress?: string
  charset?: string
  timezone?: string
  stringifyObjects?: boolean
  insecureAuth?: boolean
  typeCast?: boolean
  supportBigNumbers?: boolean
  bigNumberStrings?: boolean
  dateStrings?: boolean | string[]
  flags?: string
  ssl?: any
}
export type MysqlConfig = SharedConfigNode & {
  client: 'mysql' | 'mysql2'
  version?: string
  connection?: SharedConnectionNode & MysqlConnectionNode
  replicas?: {
    write: {
      connection: MysqlConfig['connection']
      pool?: MysqlConfig['pool']
    }
    read: {
      connection: MysqlConfig['connection'][]
      pool?: MysqlConfig['pool']
    }
  }
}

/**
 * Config is picked from PostgreSQL driver, just refer their docs
 * https://node-postgres.com/features/connecting#programmatic.
 *
 * - `returning` is added by knex and not driver.
 * - `searchPath` is also added by Knex.
 *
 * Knex forwards all config options to the driver directly. So feel
 * free to define them (let us know, in case any options are missing)
 */
type PostgresConnectionNode = {
  ssl?: boolean | ConnectionOptions
  connectionString?: string
}
export type PostgreConfig = SharedConfigNode & {
  client: 'pg' | 'postgres' | 'postgresql'
  version?: string
  returning?: string
  connection?: string | (SharedConnectionNode & PostgresConnectionNode)
  replicas?: {
    write: {
      connection: PostgreConfig['connection']
      pool?: PostgreConfig['pool']
    }
    read: {
      connection: PostgreConfig['connection'][]
      pool?: PostgreConfig['pool']
    }
  }
  searchPath?: string[]
  wrapIdentifier?: (value: string) => string
}

/**
 * Redshift uses `pg` driver. So config options are same as Postgres.
 * https://node-postgres.com/features/connecting#programmatic.
 *
 * Knex forwards all config options to the driver directly. So feel
 * free to define them (let us know, in case any options are missing)
 */
export type RedshiftConfig = PostgreConfig & {
  client: 'redshift'
}

/**
 * Please install `oracledb` driver and not the `oracle`. The later is
 * deprecated. Config is only allowed for `oracledb`.
 *
 * Please refer to the driver configuration docs to learn more about the
 * config values.
 * https://oracle.github.io/node-oracledb/doc/api.html#oracledbproperties
 */
type OracleConnectionNode = {
  autoCommit?: boolean
  connectionClass?: string
  edition?: string
  externalAuth?: boolean
  fetchArraySize?: number
  fetchAsBuffer?: any[]
  lobPrefetchSize?: number
  maxRows?: number
  oracleClientVersion?: number
  connectString?: string
}
export type OracleConfig = SharedConfigNode & {
  client: 'oracledb'
  connection?: SharedConnectionNode & OracleConnectionNode
  replicas?: {
    write: {
      connection: OracleConfig['connection']
      pool?: OracleConfig['pool']
    }
    read: {
      connection: OracleConfig['connection'][]
      pool?: OracleConfig['pool']
    }
  }
  fetchAsString?: any[]
}

/**
 * Config values are taken directly from the driver config.
 * https://www.npmjs.com/package/mssql#config.
 *
 * Knex forwards all config options to the driver directly. So feel
 * free to define them (let us know, in case any options are missing)
 */
type MssqlConnectionNode = {
  server: string
  domain?: string
  connectionTimeout?: number
  requestTimeout?: number
  parseJSON?: boolean
  options?: {
    encrypt?: boolean
    useUTC?: boolean
    tdsVersion?: string
    appName?: string
    abortTransactionOnError?: boolean
    trustedConnection?: boolean
    enableArithAbort?: boolean
    isolationLevel?:
      | 'READ_UNCOMMITTED'
      | 'READ_COMMITTED'
      | 'REPEATABLE_READ'
      | 'SERIALIZABLE'
      | 'SNAPSHOT'
    maxRetriesOnTransientErrors?: number
    multiSubnetFailover?: boolean
    packetSize?: number
    trustServerCertificate?: boolean
  }
}
export type MssqlConfig = SharedConfigNode & {
  client: 'mssql'
  version?: string
  connection?: SharedConnectionNode & MssqlConnectionNode
  replicas?: {
    write: {
      connection: MssqlConfig['connection']
      pool?: MssqlConfig['pool']
    }
    read: {
      connection: MssqlConfig['connection'][]
      pool?: MssqlConfig['pool']
    }
  }
}

/**
 * Connection config must be the config from one of the
 * available dialects
 */
export type ConnectionConfig =
  | SqliteConfig
  | MysqlConfig
  | PostgreConfig
  | OracleConfig
  | RedshiftConfig
  | MssqlConfig

/**
 * Shape of config inside the database config file
 */
export type DatabaseConfig = {
  connection: string
  prettyPrintDebugQueries?: boolean
  connections: { [key: string]: ConnectionConfig }
}

/**
 * The shape of a connection within the connection manager
 */
export type ConnectionNode = {
  name: string
  config: ConnectionConfig
  connection?: ConnectionContract
  state: 'registered' | 'migrating' | 'open' | 'closing' | 'closed'
}

/**
 * Connection manager to manage one or more database
 * connections.
 */
export interface ConnectionManagerContract {
  /**
   * List of registered connection. You must check the connection state
   * to understand, if it is connected or not
   */
  connections: Map<string, ConnectionNode>

  /**
   * Add a new connection to the list of managed connection. You must call
   * connect separately to instantiate a connection instance
   */
  add(connectionName: string, config: ConnectionConfig): void

  /**
   * Instantiate a connection. It is a noop, when connection for the given
   * name is already instantiated
   */
  connect(connectionName: string): void

  /**
   * Get connection node
   */
  get(connectionName: string): ConnectionNode | undefined

  /**
   * Find if a connection name is managed by the manager or not
   */
  has(connectionName: string): boolean

  /**
   * Patch the existing connection config. This triggers the disconnect on the
   * old connection
   */
  patch(connectionName: string, config: ConnectionConfig): void

  /**
   * Find if a managed connection is instantiated or not
   */
  isConnected(connectionName: string): boolean

  /**
   * Close a given connection. This is also kill the underlying knex connection
   * pool
   */
  close(connectionName: string, release?: boolean): Promise<void>

  /**
   * Close all managed connections
   */
  closeAll(release?: boolean): Promise<void>

  /**
   * Release a given connection. Releasing a connection means, you will have to
   * re-add it using the `add` method
   */
  release(connectionName: string): Promise<void>

  /**
   * Returns the health check report for registered connections
   */
  report(): Promise<any & { meta: ReportNode[] }>
}

/**
 * Connection represents a single knex instance with inbuilt
 * pooling capabilities.
 */
export interface ConnectionContract extends EventEmitter {
  client?: Knex
  readClient?: Knex

  readonly dialectName:
    | 'mssql'
    | 'mysql'
    | 'mysql2'
    | 'oracledb'
    | 'postgres'
    | 'redshift'
    | 'sqlite3'

  /**
   * Property to find if explicit read/write is enabled
   */
  readonly hasReadWriteReplicas: boolean

  /**
   * Read/write connection pools
   */
  pool: null | Pool<any>
  readPool: null | Pool<any>

  /**
   * Name of the connection
   */
  readonly name: string

  /**
   * Find if connection is ready or not
   */
  readonly ready: boolean

  /**
   * Untouched config
   */
  config: ConnectionConfig

  /**
   * List of emitted events
   */
  on(event: 'connect', callback: (connection: ConnectionContract) => void): this
  on(event: 'error', callback: (error: Error, connection: ConnectionContract) => void): this
  on(event: 'disconnect', callback: (connection: ConnectionContract) => void): this
  on(
    event: 'disconnect:error',
    callback: (error: Error, connection: ConnectionContract) => void
  ): this

  /**
   * Make knex connection
   */
  connect(): void

  /**
   * Disconnect knex
   */
  disconnect(): Promise<void>

  /**
   * Returns the connection report
   */
  getReport(): Promise<ReportNode>
}

/**
 * Options when retrieving new query client from the database
 * query builder
 */
export type DatabaseClientOptions = Partial<{
  mode: 'read' | 'write'
}>

/**
 * Shape of the data emitted by the `db:query event`
 */
export type DbQueryEventNode = {
  connection: string
  model?: string
  ddl?: boolean
  duration?: [number, number]
  method: string
  sql: string
  bindings?: any[]
  inTransaction?: boolean
}
