/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import type { RefExpressionBuilder } from '../expression_builders/ref_expression_builder.js'
import type { RawExpressionBuilder } from '../expression_builders/raw_expression_builder.js'
import type { SelectExpressionBuilder } from '../expression_builders/select_expression_builder.js'
import type { SelectQueryBuilder } from '../query_builders/select_query_builder.js'

/**
 * A set of operators suggestions for the where clause. Additional unknown
 * operators can be used as well.
 */
export type WhereOperator = '=' | '!=' | '<>' | '>' | '>=' | '<' | '<=' | '<=>' | '~' | '~*' | '!~*'

/**
 * Set of strict values accepted and transformed by Knex natively
 */
export type KnexStrictValues = string | number | boolean | Date | Buffer

/**
 * Allowed values for the bindings for a raw query
 */
export type RawQueryBindings =
  | { [key: string]: KnexStrictValues | KnexStrictValues[] }
  | KnexStrictValues[]

/**
 * A union of expressions accepted by the query builder
 */
export type QueryBuilderValueExpressions =
  | SelectExpressionBuilder
  | RawExpressionBuilder
  | RefExpressionBuilder
  | ((query: SelectExpressionBuilder) => void)

/**
 * Expressions allowed when selecting columns from the database
 */
export type SelectExpressions =
  | string
  | QueryBuilderValueExpressions
  | Record<string, string | QueryBuilderValueExpressions>

/**
 * Expressions allowed when selecting tables from the database
 */
export type FromExpressions = string | QueryBuilderValueExpressions

/**
 * A set of arguments accepted by different where methods.
 */
export type WhereExpressionArguments =
  | [
      column: string | RawExpressionBuilder | RefExpressionBuilder,
      operator: WhereOperator | (string & {}),
      value: KnexStrictValues | QueryBuilderValueExpressions,
    ]
  | [
      column: string | RawExpressionBuilder | RefExpressionBuilder,
      value: KnexStrictValues | QueryBuilderValueExpressions,
    ]
  | [dict: Record<string, KnexStrictValues | QueryBuilderValueExpressions>]

/**
 * A set of arguments accepted by the whereIn method
 */
export type WhereInExpressionArguments = [
  column: string | string[] | RawExpressionBuilder | RefExpressionBuilder,
  value: KnexStrictValues[] | QueryBuilderValueExpressions,
]

/**
 * A set of arguments accepted by the whereJsonObject method
 */
export type WhereJSONObjectExpressionArguments = [
  column: string | RawExpressionBuilder | RefExpressionBuilder,
  value: string | Record<string, any> | QueryBuilderValueExpressions,
]

/**
 * A set of arguments accepted by the whereJsonPath method
 */
export type WhereJSONPathExpressionArguments =
  | [
      column: string | RawExpressionBuilder | RefExpressionBuilder,
      jsonPath: string,
      operator: WhereOperator,
      value: QueryBuilderValueExpressions,
    ]
  | [
      column: string | RawExpressionBuilder | RefExpressionBuilder,
      jsonPath: string,
      operator: WhereOperator,
      value: any,
    ]

/**
 * Interface to be implemented by the database clients
 */
export interface DatabaseClientContract {
  /**
   * Check if the client belongs to a database transaction.
   */
  readonly isTransaction: boolean

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
   * Reference to the connection's unique identifier
   */
  readonly connectionIdentifier: string

  /**
   * The name of the connection from which the client
   * was originated.
   *
   * @deprecated
   * Instead use {@link DatabaseClientContract.connectionIdentifier}
   */
  readonly connectionName: string

  /**
   * When enabled, client will emit "db:query" event for every executed
   * SQL query.
   */
  debug: boolean

  /**
   * Returns reference to the read client for executing the
   * read queries.
   *
   * - Returns write client when `mode=write`
   * - Returns read client when `mode=dual|read`.
   */
  getReadClient(): Knex

  /**
   * Returns reference to the write client for executing the
   * write queries. This method will throw an error when the
   * DatabaseClient instance is created in "read" mode.
   */
  getWriteClient(): Knex

  /**
   * Returns instance of the {@link RefExpressionBuilder}
   */
  ref(reference: string): RefExpressionBuilder

  /**
   * Returns instance of the {@link RawExpressionBuilder}
   */
  raw(sql: string, bindings?: RawQueryBindings): RawExpressionBuilder

  /**
   * Listen when a new instance of the {@link SelectQueryBuilder} is created
   */
  onQuery(callback: (query: SelectQueryBuilder) => void): void

  /**
   * Creates an instance of the {@link SelectQueryBuilder}
   */
  query(): SelectQueryBuilder
}
