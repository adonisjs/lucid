/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import type { ConnectionConfig as PGConnectionOptions } from 'pg'
import type { ConnectionOptions as MySQL2ConnectionOptions } from 'mysql2'
import type { Options as BetterSQLiteConnectionOptions } from 'better-sqlite3'

/**
 * A dialect refers to the SQL flavor supported by Lucid. However,
 * different JavaScript clients can be used for the same dialect.
 *
 * For example: One can use the `sqlite3` or `better-sqlite3` with
 * the `sqlite3` dialect.
 *
 * The number of supported dialects are usually fixed and we do not add
 * the new one's very often and neither they can be added from outside
 */
export type SupportedDialectNames = 'mssql' | 'mysql' | 'postgres' | 'sqlite3'

/**
 * Configuration options accepted by the MigrationsRunner
 */
export type MigrationsConfig = {
  /**
   * Run migrations without wrapping SQL queries inside transactions.
   * By default, all statements in a given migration file are
   * wrapped inside a single transaction.
   */
  disableTransactions?: boolean

  /**
   * Paths from where to scan the migration files. These paths should
   * be relative from the application root, or a reference to a
   * directory inside a package.
   */
  paths?: string[]

  /**
   * Name of the table for storing the migrations history.
   *
   * Defaults to "adonis_schema"
   */
  tableName?: string

  /**
   * Disable rollbing back transactions in production.
   *
   * Defaults to "true"
   */
  disableRollbacksInProduction?: boolean

  /**
   * Sort migration files using natural sort.
   *
   * Defaults to "false" for legacy reasons. Must be set
   * to true.
   */
  naturalSort?: boolean
}

/**
 * Configuration options applicable for all dialects/clients
 */
export type SharedConfigOptions = {
  /**
   * The "useNullAsDefault" option will replace undefined values during the
   * insert and update queries with `NULL`. By default, they are replaced
   * with "DEFAULT" keyword
   */
  useNullAsDefault?: boolean

  /**
   * Enable query debugging. When query debugging is enabled, Lucid
   * will emit the `db:query` event for all the executed queries
   */
  debug?: boolean

  /**
   * The "asyncStackTraces: true" flag will turn on stack trace capture for all query
   * builders, raw queries and schema builders. When a DB driver returns an error,
   * this previously captured stack trace is thrown instead of a new one. This
   * helps to mitigate default behaviour of await in node.js/V8 which blows
   * the stack away. This has small performance overhead, so it is advised
   * to use only for development.
   *
   * Turned off by default.
   */
  asyncStackTraces?: boolean

  /**
   * Define configuration options for the "DbWipeCommand".
   */
  wipe?: {
    /**
     * The name of tables to ignore when wiping the database using the
     * "DbWipeCommand".
     */
    ignoreTables?: string[]

    /**
     * The name of views to ignore when wiping the database using the
     * "DbWipeCommand".
     */
    ignoreViews?: string[]

    /**
     * The name of types/domains to ignore when wiping the database using the
     * "DbWipeCommand".
     */
    ignoreTypes?: string[]
  }

  /**
   * Pool options. These options are provided to https://github.com/vincit/tarn.js/
   * as it is.
   *
   * Do note: Knex uses Tarn as a unified interface for connection pool management
   * and does not rely use the pooling features from individual clients.
   */
  pool?: {
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
    afterCreate?: (conn: any, done: any) => void
  }

  /**
   * Configuration options to configure migrations.
   */
  migrations?: MigrationsConfig
}

/**
 * Configuration options accepted by the "pg" client
 */
export type PGConfigOptions = SharedConfigOptions & {
  dialectName: 'postgres'
  clientName: 'pg'
  client: 'pg'
  connection: PGConnectionOptions

  /**
   * Define the search path for the database queries. PostgreSQL natively
   * will search the table in the all provided schemas when an explicitly
   * schema name is not defined.
   *
   * https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH
   */
  searchPath?: string[]

  /**
   * Force cascade when truncating a given table. This option
   * all allow truncating a table without first deleting the
   * foreign key references.
   */
  cascadeTruncate?: boolean
}

/**
 * Configuration options accepted by the "mysql2" client
 */
export type MySQL2ConfigOptions = SharedConfigOptions & {
  dialectName: 'mysql'
  clientName: 'mysql2'
  client: 'mysql2'
  connection: MySQL2ConnectionOptions
}

/**
 * Configuration options accepted by the "better-sqlite3" client
 */
export type BetterSQLiteConfigOptions = SharedConfigOptions & {
  dialectName: 'sqlite3'
  clientName: 'better-sqlite3'
  client: 'better-sqlite3'
  connection: {
    filename: string
    options?: BetterSQLiteConnectionOptions
  }
}

/**
 * Configuration options accepted by the "tedious" client
 */
export type TediousConfigOptions = SharedConfigOptions & {
  dialectName: 'mssql'
  clientName: 'mssql'
  client: 'mssql'
  connection: Knex.MsSqlConnectionConfig & {
    /**
     * User is supported by the Knex runtime code
     */
    user: string
  }
}

/**
 * Configuration options to create a new Connection. The client and connection
 * properties are provided to knex as it is.
 */
export type ConnectionConfig = SharedConfigOptions & {
  dialectName: SupportedDialectNames
  clientName: string
  client: string | typeof Knex.Client
  connection?: any
  replicas?: {
    write: {
      connection: any
      pool?: SharedConfigOptions['pool']
    }
    read: {
      connection: any[]
      pool?: SharedConfigOptions['pool']
    }
  }
}
