/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import type { AbstractQueryBuilder } from './querybuilders/abstract_query_builder.js'

/**
 * A dialect refers to the SQL flavor supported by Lucid. However,
 * different JavaScript clients can be used for the same dialect.
 *
 * For example: One can use the `sqlite3` or `better-sqlite3` with
 * the `sqlite3` dialect.
 *
 * The number of supported dialects are usually fixed and we do not add
 * the new one's very often.
 */
export type SupportedDialectNames = 'mssql' | 'mysql' | 'postgres' | 'sqlite3'

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
   * Define configuration options for the "db:wipe" command.
   */
  wipe?: {
    /**
     * The name of tables to ignore when wiping the database using the
     * "db:wipe" command
     */
    ignoreTables?: string[]
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

/**
 * A known set of values allowed when defining values for different
 * clauses
 */
export type StrictValues =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | Date[]
  | boolean[]
  | Buffer

/**
 * SelectExpressions refer to the values accepted by the "select"
 * method.
 *
 * - A string value represents the column name. "email".
 * - A string value can also represent a column name + alias. "email as e".
 * - AbstractQueryBuilder represents a subquery that must produce a single
 *   row. "SELECT (SELECT profiles.email from profiles LIMIT 1) from users";
 */
export type SelectExpressions = string | AbstractQueryBuilder
