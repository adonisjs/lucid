/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Connection } from '../connection.js'
import type { DialectContract } from './dialect.js'
import type { RefExpressionBuilder } from '../expression_builders/ref_expression_builder.js'
import type { RawExpressionBuilder } from '../expression_builders/raw_expression_builder.js'
import type { SelectExpressionBuilder } from '../expression_builders/select_expression_builder.js'

export type RawQueryBindingValues =
  | string
  | number
  | boolean
  | Date
  | Array<string>
  | Array<number>
  | Array<Date>
  | Array<boolean>
  | Buffer
export type RawQueryBindings = { [key: string]: RawQueryBindingValues } | RawQueryBindingValues[]

/**
 * Expressions allowed when selecting columns from the database
 */
export type SelectExpressions =
  | string
  | SelectExpressionBuilder
  | RefExpressionBuilder
  | RawExpressionBuilder
  | ((query: SelectExpressionBuilder) => void)
  | Record<string, string | SelectExpressionBuilder | ((query: SelectExpressionBuilder) => void)>

/**
 * Expressions allowed when selecting tables from the database
 */
export type FromExpressions =
  | string
  | SelectExpressionBuilder
  | RawExpressionBuilder
  | ((query: SelectExpressionBuilder) => void)

/**
 * Interface to be implemented by the query and the transaction clients
 */
export interface QueryClientContract {
  /**
   * Check if the client belongs to a database transaction.
   */
  readonly isTransaction: boolean

  /**
   * Reference to the database dialect for which the query client
   * was created. A query client is always tied to a dialect.
   */
  readonly dialect: DialectContract

  /**
   * Reference to the connection for which the query client was created.
   * A query client is always tied to a connection.
   */
  readonly connection: Connection

  /**
   * The mode in which the client should execute queries. In dual mode,
   * the query client will send SELECT queries to the "read" connection
   * and all other queries to the write connection.
   *
   * In write mode, all queries will be sent to the write connection.
   * Whereas, in read mode, write queries will be disallowed.
   */
  readonly mode: 'dual' | 'write' | 'read'

  /**
   * The name of the connection from which the client
   * was originated.
   *
   * @deprecated
   * Instead use {@link Connection.identifier}
   */
  readonly connectionName: string

  /**
   * When enabled, client will emit "db:query" event for every executed
   * SQL query.
   */
  debug: boolean

  /**
   * Returns instance of the {@link RefExpressionBuilder}
   */
  ref(reference: string): RefExpressionBuilder

  /**
   * Returns instance of the {@link RawExpressionBuilder}
   */
  raw(sql: string, bindings?: RawQueryBindings): RawExpressionBuilder
}
