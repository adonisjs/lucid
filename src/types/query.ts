/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import type { DialectContract } from './dialect.js'
import type { UpdateQueryBuilder } from '../query_builders/update_query_builder.js'
import type { DeleteQueryBuilder } from '../query_builders/delete_query_builder.js'
import type { SelectQueryBuilder } from '../query_builders/select_query_builder.js'
import type { InsertQueryBuilder } from '../query_builders/insert_query_builder.js'
import type { RawExpressionBuilder } from '../expression_builders/raw_expression_builder.js'
import type { RefExpressionBuilder } from '../expression_builders/ref_expression_builder.js'
import type { JoinExpressionBuilder } from '../expression_builders/join_expression_builder.js'
import type { WithExpressionBuilder } from '../expression_builders/with_expression_builder.js'
import type { SelectExpressionBuilder } from '../expression_builders/select_expression_builder.js'
import { TransactionClient } from '../database_clients/transaction_client.js'

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
export type FromExpressionArguments = [
  string | string[] | Record<string, string> | QueryBuilderValueExpressions,
]

/**
 * Expressions allowed when applying a with clause to the SQL query
 */
export type WithExpressionArguments =
  | [
      alias: string,
      columns: string[],
      value:
        | RawExpressionBuilder
        | InsertQueryBuilder
        | SelectExpressionBuilder
        | ((
            client: DatabaseClientContract
          ) => RawExpressionBuilder | InsertQueryBuilder | SelectExpressionBuilder),
    ]
  | [
      alias: string,
      value:
        | RawExpressionBuilder
        | InsertQueryBuilder
        | SelectExpressionBuilder
        | ((
            client: DatabaseClientContract
          ) => RawExpressionBuilder | InsertQueryBuilder | SelectExpressionBuilder),
    ]

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
 * A set of arguments accepted by different where column method.
 */
export type WhereColumnExpressionArguments =
  | [
      column: string | RawExpressionBuilder | RefExpressionBuilder,
      operator: WhereOperator | (string & {}),
      otherColumn: string,
    ]
  | [column: string | RawExpressionBuilder | RefExpressionBuilder, otherColumn: string]
  | [dict: Record<string, string>]

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
 * A set of arguments accepted by the whereNull method
 */
export type WhereNullExpressionArguments = [
  column: string | RawExpressionBuilder | RefExpressionBuilder,
]

/**
 * A set of arguments accepted by the whereExists method
 */
export type WhereExistsExpressionArguments = [expression: QueryBuilderValueExpressions]

/**
 * A set of arguments accepted by the whereBetween method
 */
export type WhereBetweenExpressionArguments = [
  column: string | RawExpressionBuilder | RefExpressionBuilder,
  value: [
    KnexStrictValues | QueryBuilderValueExpressions,
    KnexStrictValues | QueryBuilderValueExpressions,
  ],
]

/**
 * A set of arguments accepted by the join on condition
 */
export type OnExpressionArguments =
  | [
      primaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
      operator: WhereOperator | (string & {}),
      secondaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
    ]
  | [
      primaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
      secondaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
    ]

/**
 * A set of arguments accepted by the join on condition specifying
 * a raw comparsion value
 */
export type OnValueExpressionArguments =
  | [
      primaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
      operator: WhereOperator | (string & {}),
      value: KnexStrictValues,
    ]
  | [primaryColumn: string | RefExpressionBuilder | RawExpressionBuilder, value: KnexStrictValues]

/**
 * A set of arguments accepted by the join onNull condition
 */
export type OnNullExpressionArguments = [
  column: string | RawExpressionBuilder | RefExpressionBuilder,
]

/**
 * A set of arguments accepted by the onExists method
 */
export type OnExistsExpressionArguments = [expression: QueryBuilderValueExpressions]

/**
 * A set of arguments accepted by the onIn method
 */
export type OnInExpressionArguments = [
  column: string | string[] | RawExpressionBuilder | RefExpressionBuilder,
  value: KnexStrictValues[] | QueryBuilderValueExpressions,
]

/**
 * A set of arguments accepted by the onBetween method
 */
export type OnBetweenExpressionArguments = [
  column: string | RawExpressionBuilder | RefExpressionBuilder,
  value: [
    KnexStrictValues | QueryBuilderValueExpressions,
    KnexStrictValues | QueryBuilderValueExpressions,
  ],
]

/**
 * A set of arguments accepted by the join methods
 */
export type JoinExpressionArguments =
  | [
      table: string | QueryBuilderValueExpressions,
      primaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
      operator: WhereOperator | (string & {}),
      secondaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
    ]
  | [
      table: string | QueryBuilderValueExpressions,
      primaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
      secondaryColumn: string | RefExpressionBuilder | RawExpressionBuilder,
    ]
  | [table: string, callback: (joinExpression: JoinExpressionBuilder) => void]

/**
 * Arguments accepted by the "orderBy" method
 */
export type OrderByExpressionArguments =
  | [column: string | QueryBuilderValueExpressions, direction?: 'asc' | 'desc']
  | [columns: string[]]
  | [
      {
        column: string | QueryBuilderValueExpressions
        order?: 'asc' | 'desc'
        nulls?: 'first' | 'last'
      }[],
    ]

/**
 * Data emitted by the "db:query" event
 */
export type DbQueryEventData = Knex.Sql & Record<string, any>

/**
 * Data emitted by the "db:transaction:begin" event
 */
export type DbTransactionBeginEventData = Record<string, any>

/**
 * Data emitted by the "db:transaction:commit" event
 */
export type DbTransactionCommitEventData = Record<string, any>

/**
 * Data emitted by the "db:transaction:rollback" event
 */
export type DbTransactionRollbackEventData = Record<string, any>

/**
 * Must be implemented by query builders that can be executed using the
 * query client.
 */
export interface CanBeExecuted {
  /**
   * "db:query" event will be executed for the query when debugging
   * is enabled.
   */
  debugging: boolean

  /**
   * The context to share with the "db:query" event
   */
  getContext(): Record<string, any>

  /**
   * The knex query to execute
   */
  knexQuery: Knex.QueryBuilder

  /**
   * Write queries refers to the queries that changes the database
   * state and read query is the SELECT query
   */
  queryType: 'read' | 'write'
}

/**
 * Interface to be implemented by the database clients
 */
export interface DatabaseClientContract {
  /**
   * Returns the query context
   */
  getContext(): Record<string, any>

  /**
   * Define the context to be shared with the query builders created
   * using the given DatabaseClient.
   *
   * This method will override existing context with provided values.
   * Use {@link DatabaseClientContract.withContext} to merge values
   */
  setContext(context: Record<string, any>): this

  /**
   * Define the context to be shared with the query builders created
   * using the given DatabaseClient.
   *
   * The provided values will be shallow merged with the existing
   * values. Use {@link DatabaseClientContract.setContext} to remove existing context with
   * new values.
   */
  withContext(context: Record<string, any>): this

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
   *
   * In case of transactions, the mode is always set to "write"
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
   * Returns the dialect for the given connection. The method throws an
   * error when the DatabaseClient instance is created in read mode and
   * you try to access the dialect.
   */
  getDialect(): DialectContract

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
   * Creates a common table expression query.
   *
   * @example
   * ```ts
   * db.with('jennifers', (client) => {
   *   db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
   * })
   * .selectFrom('jennifers')
   * .select('*')
   * ```
   */
  with(...expression: WithExpressionArguments): WithExpressionBuilder

  /**
   * Creates a recursive common table expression query.
   *
   * @example
   * ```ts
   * db.withRecursive('jennifers', (client) => {
   *   db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
   * })
   * .selectFrom('jennifers')
   * .select('*')
   * ```
   */
  withRecursive(...expression: WithExpressionArguments): WithExpressionBuilder

  /**
   * Creates a common table expression query as a materialized view. Works
   * only with "PostgreSQL" and "SQLite".
   *
   * @example
   * ```ts
   * db.withMaterialized('jennifers', (client) => {
   *   db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
   * })
   * .selectFrom('jennifers')
   * .select('*')
   * ```
   */
  withMaterialized(...expression: WithExpressionArguments): WithExpressionBuilder

  /**
   * Creates a common table expression query with "not materialized" expression. Works
   * only with "PostgreSQL" and "SQLite".
   *
   * @example
   * ```ts
   * db.withMaterialized('jennifers', (client) => {
   *   db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
   * })
   * .selectFrom('jennifers')
   * .select('*')
   * ```
   */
  withNotMaterialized(...expression: WithExpressionArguments): WithExpressionBuilder

  /**
   * Returns instance of the {@link RefExpressionBuilder}. Ref expressions can
   * be used to specify a column value with methods that accepts a value.
   *
   * You cannot execute a ref expression
   *
   * @example
   * ```ts
   * db.selectFrom('users').where('email', '=', db.ref('username'))
   * ```
   */
  ref(reference: string): RefExpressionBuilder

  /**
   * Returns instance of the {@link RawExpressionBuilder}. Raw expressions can
   * be used to specify raw queries as the argument of a method.
   *
   * RawExpressions cannot be executed. Instead use {@link DatabaseClientContract.rawQuery}
   * to create an executable raw query.
   *
   * @example
   * ```ts
   * db.selectFrom('users').where(db.raw('?? = ??', ['email', 'username']))
   * ```
   */
  raw(sql: string, bindings?: RawQueryBindings): RawExpressionBuilder

  /**
   * Listen when a new instance of the {@link SelectQueryBuilder} is created.
   *
   * You can use this hook to modify query builder instances created using
   * a given instance of a DatabaseClient.
   *
   * ```ts
   * db.onQuery((query) => query.whereNull('is_deleted'))
   * ```
   */
  onQuery(callback: (query: SelectQueryBuilder) => void): void

  /**
   * Listen when a new instance of the {@link InsertQueryBuilder} is created.
   *
   * You can use this hook to modify query builder instances created using
   * a given instance of a DatabaseClient.
   */
  onInsertQuery(callback: (query: InsertQueryBuilder) => void): void

  /**
   * Listen when a new instance of the {@link UpdateQueryBuilder} is created.
   * You can use this hook to modify query builder instances created using
   * a given instance of a DatabaseClient.
   *
   * ```ts
   * db.onUpdateQuery((query) => query.where('tenant_id', tenant.id))
   * ```
   */
  onUpdateQuery(callback: (query: UpdateQueryBuilder) => void): void

  /**
   * Listen when a new instance of the {@link DeleteQueryBuilder} is created.
   *
   * You can use this hook to modify query builder instances created using
   * a given instance of a DatabaseClient.
   *
   * ```ts
   * db.onDeleteQuery((query) => query.where('tenant_id', tenant.id))
   * ```
   */
  onDeleteQuery(callback: (query: DeleteQueryBuilder) => void): void

  /**
   * Returns an instance of the {@link SelectQueryBuilder} and specifies
   * the table(s) for selection
   *
   * @deprecated
   * Instead use {@link DatabaseClientContract.selectFrom}
   */
  from(...expression: FromExpressionArguments): SelectQueryBuilder

  /**
   * Returns an instance of the  {@link SelectQueryBuilder} and specifies
   * the table(s) for selection.
   *
   * @example
   * ```ts
   * db.selectFrom('users').exec()
   * ```
   */
  selectFrom(...expression: FromExpressionArguments): SelectQueryBuilder

  /**
   * Returns an instance of the  {@link InsertQueryBuilder} and specifies
   * the table in which to insert the data.
   *
   * @deprecated
   * Instead use {@link DatabaseClientContract.selectFrom}
   */
  table(tableName: string): InsertQueryBuilder

  /**
   * Returns an instance of the  {@link InsertQueryBuilder} and specifies
   * the table in which to insert the data.
   *
   * @example
   * ```ts
   * db.insertInto('users').values({
   * }).exec()
   *
   * // bulk insert
   * db.insertInto('users').values([
   *   {},
   *   {},
   * ]).exec()
   * ```
   *
   * // insert using subquery
   * db.insertInto('users')
   *  .columns([])
   *  .using(() => {
   *  }).exec()
   * ```
   */
  insertInto(tableName: string): InsertQueryBuilder

  /**
   * Returns an instance of the  {@link UpdateQueryBuilder} and specifies
   * the table for the update.
   */
  updateTable(tableName: string): UpdateQueryBuilder

  /**
   * Returns an instance of the  {@link DeleteQueryBuilder} and specifies
   * the table for the delete.
   */
  deleteFrom(tableName: string): DeleteQueryBuilder

  /**
   * Creates an instance of the {@link SelectQueryBuilder}
   */
  query(): SelectQueryBuilder

  /**
   * Creates an instance of the {@link InsertQueryBuilder}
   */
  insertQuery(): InsertQueryBuilder

  /**
   * Creates an instance of the {@link UpdateQueryBuilder}
   */
  updateQuery(): UpdateQueryBuilder

  /**
   * Creates an instance of the {@link DeleteQueryBuilder}
   */
  deleteQuery(): DeleteQueryBuilder

  /**
   * Executes a executable query and returns its results back.
   */
  exec<T>(query: CanBeExecuted): Promise<T>

  transaction(options?: { isolationLevel?: IsolationLevels }): Promise<TransactionClient>
  transaction<T>(
    callback: (trx: TransactionClient) => T,
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<T>
}
