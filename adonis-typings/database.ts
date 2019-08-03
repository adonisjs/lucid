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
  import * as knex from 'knex'
  import { Pool } from 'tarn'
  import { EventEmitter } from 'events'

  import { DatabaseQueryBuilderContract } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

  /**
   * Connection node used by majority of database
   * clients
   */
  type SharedConnectionNode = {
    host: string,
    user: string,
    password: string,
    database: string,
    port: number,
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
  }

  /**
   * The MYSQL specific config options are taken directly from the
   * driver. https://www.npmjs.com/package/mysql#connection-options
   *
   * Knex forwards all config options to the driver directly. So feel
   * free to define them (let us know, in case any options are missing)
   */
  export type MysqlConfigContract = SharedConfigNode & {
    client: 'mysql',
    version?: string,
    connection: SharedConnectionNode & {
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
    connection: string | SharedConnectionNode,
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
  export type OracleConfigContract = SharedConfigNode & {
    client: 'oracledb',
    connection: SharedConnectionNode & {
      autoCommit?: boolean,
      connectionClass?: string,
      edition?: string,
      externalAuth?: boolean,
      fetchArraySize?: number,
      fetchAsBuffer?: any[],
      lobPrefetchSize?: number,
      maxRows?: number,
      oracleClientVersion?: number,
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
  export type MssqlConfigContract = SharedConfigNode & {
    client: 'mssql',
    version?: string,
    connection: SharedConnectionNode & {
      domain?: string,
      connectionTimeout?: number,
      requestTimeout?: number,
      parseJSON?: boolean,
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
  export type DatabaseConfigContract = { connection: string } & { [key: string]: ConnectionConfigContract }

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
    connections: Map<string, ConnectionManagerConnectionNode>

    on (event: 'connect', callback: (connection: ConnectionContract) => void)
    on (event: 'disconnect', callback: (connection: ConnectionContract) => void)

    add (connectionName: string, config: ConnectionConfigContract): void
    connect (connectionName: string): void
    get (connectionName: string): ConnectionManagerConnectionNode | undefined
    has (connectionName: string): boolean
    isConnected (connectionName: string): boolean

    close (connectionName: string, release?: boolean): Promise<void>
    closeAll (release?: boolean): Promise<void>
    release (connectionName: string): Promise<void>
  }

  /**
   * Connection represents a single knex instance with inbuilt
   * pooling capabilities.
   */
  export interface ConnectionContract extends EventEmitter {
    client?: knex,
    pool: null | Pool<any>,
    name: string,
    config: ConnectionConfigContract,

    /**
     * List of emitted events
     */
    on (event: 'connect', callback: (connection: ConnectionContract) => void)
    on (event: 'error', callback: (connection: ConnectionContract, error: Error) => void)
    on (event: 'disconnect', callback: (connection: ConnectionContract) => void)
    on (event: 'disconnect:error', callback: (connection: ConnectionContract, error: Error) => void)

    connect (): void,
    disconnect (): Promise<void>,
  }

  export interface DatabaseContract {
    query (): DatabaseQueryBuilderContract,
    from: DatabaseQueryBuilderContract['from'],
  }
}
