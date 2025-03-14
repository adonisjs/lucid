/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import * as errors from '../errors.js'
import { TO_KNEX } from '../symbols.js'
import { transformValueExpressions } from '../helpers.js'
import { RawExpressionBuilder } from '../expression_builders/raw_expression_builder.js'
import { SelectExpressionBuilder } from '../expression_builders/select_expression_builder.js'
import { ConflictExpressionBuilder } from '../expression_builders/conflict_expression_builder.js'
import type {
  CanBeExecuted,
  DatabaseClientContract,
  QueryBuilderValueExpressions,
} from '../types/query.js'

export class InsertQueryBuilder implements CanBeExecuted {
  #tableName?: string

  /**
   * Should be shared during clone
   */
  #context: Record<string, any> = {}

  /**
   * Reference to knex client. Needed for converting "RawExpression" and
   * "RefExpression" classes to knex compatible values
   */
  protected knex: Knex

  /**
   * Flag to know if debugging it enabled or not
   */
  debugging: boolean = false

  /**
   * Underlying knex query to mutate
   */
  knexQuery: Knex.QueryBuilder

  /**
   * The queryType is used the query client
   */
  readonly queryType = 'write'

  constructor(protected client: DatabaseClientContract) {
    this.knex = client.getWriteClient()
    this.knexQuery = this.knex.queryBuilder()
  }

  /**
   * Transforms the insert row object to a value that knex can process.
   */
  #transformRow(row: Record<string, any>) {
    return Object.keys(row).reduce<Record<string, any>>((result, key) => {
      const value = row[key]
      const transformedValue = transformValueExpressions(value, this, this.knex)
      if (transformedValue === undefined) {
        result[this.transformColumnName(key)] = value
      } else {
        result[this.transformColumnName(key)] = transformedValue
      }
      return result
    }, {})
  }

  /**
   * Clones the current query with its query context, applied SQL
   * conditions and debugging state.
   */
  clone() {
    const clonedQuery = new InsertQueryBuilder(this.client)
    clonedQuery.setContext({ ...this.getContext() })
    clonedQuery.knexQuery = this.knexQuery.clone()
    clonedQuery.debugging = this.debugging
    this.#tableName && clonedQuery.table(this.#tableName)

    return clonedQuery
  }

  /**
   * Returns the query context
   */
  getContext(): Record<string, any> {
    return this.#context
  }

  /**
   * Define the context to be shared with the "db:query" event.
   *
   * This method will override existing context with provided values.
   * Use {@link InsertQueryBuilder.withContext} to merge values
   */
  setContext(context: Record<string, any>): this {
    this.#context = context
    return this
  }

  /**
   * Define the context to be shared with the "db:query" event.
   *
   * The provided values will be shallow merged with the existing
   * values. Use {@link InsertQueryBuilder.setContext} to remove existing context with
   * new values.
   */
  withContext(context: Record<string, any>): this {
    Object.assign(this.#context, context)
    return this
  }

  /**
   * Function to transform column names provided as values to the
   * "values" method.
   */
  transformColumnName(key: string): string {
    return key
  }

  /**
   * Returns an instance of the {@link SelectExpressionBuilder}
   */
  createSelectSubQuery() {
    return new SelectExpressionBuilder(this.client)
  }

  /**
   * Enable/disable query debugging for the current query builder.
   * Debugging will emit the "db:query" event
   */
  debug(toggle: boolean = true) {
    this.debugging = toggle
    return this
  }

  /**
   * Specify the table for the insert query.
   *
   * @example
   * ```ts
   * query.table('users')
   * ```
   */
  table(tableName: string): this {
    this.#tableName = tableName
    this.knexQuery.table(tableName)
    return this
  }

  /**
   * Define the values to insert into the table. Values must be an object
   * or an array of objects. The values for object keys can be following
   *
   * - A literal value to insert to the database.
   * - {@link RefExpressionBuilder} to point to an existing value.
   * - {@link SelectExpressionBuilder} to define the value from a select query.
   * - {@link RawExpressionBuilder} to define the value using a raw query.
   *
   * @example
   * ```ts
   * query.insertInto('users').values({
   *   first_name: 'Harminder',
   *   last_name: 'Virk',
   *   username: 'virk@adonisjs.com',
   *   email: 'virk@adonisjs.com',
   *   age: 35,
   *   role_id: (q: SelectExpressionBuilder) =>
   *     q.from('roles').select('id').where('is_default', true),
   *  })
   * ```
   */
  values(
    values: Record<string, any> | Record<string, any>[],
    options?: {
      includeTriggerModifications: boolean
    }
  ): this {
    if (Array.isArray(values)) {
      this.knexQuery.insert(
        values.map((row) => this.#transformRow(row)),
        [],
        options
      )
    } else {
      this.knexQuery.insert(this.#transformRow(values), [], options)
    }

    return this
  }

  /**
   * Define the columns for the insert query and chain the "using"
   * method to specify the values via a subquery builder or raw query.
   *
   * @example
   * ```ts
   * query
   *   .insertInto('expired_tokens')
   *   .columns(['token', 'user_id', 'expires_at'])
   *   .using((query) => {
   *     return query
   *       .select('token', 'user_id', 'expires_at')
   *       .where('expires_at', '<=', client.raw('now()'))
   *   })
   * ```
   */
  columns(columns: string[]) {
    this.knexQuery.into(
      this.knex.raw(`?? (${columns.map(() => `??`).join(', ')})`, [this.#tableName, ...columns])
    )

    const parent = this
    return {
      using(
        query: QueryBuilderValueExpressions,
        options?: {
          includeTriggerModifications: boolean
        }
      ): InsertQueryBuilder {
        const transformedValue = transformValueExpressions(query, parent, parent.knex)
        if (!transformedValue) {
          throw new errors.E_INVALID_SQL_EXPRESSION([query, 'insertUsing'])
        }

        parent.knexQuery.insert(transformedValue, [], options)
        return parent
      },
    }
  }

  /**
   * Specify an ON CONFLICT condition for the query. For PostgreSQL and
   * SQLite, you must specify columns that are either primary keys
   * or have unique index. MySQL always uses the primary key to
   * detect a conflict.
   *
   * @example
   * ```ts
   * query.onConflict(['email']).ignore()
   * ```
   *
   * When using PostgreSQL and SQLite, you can also use a raw query.
   *
   * @example
   * ```ts
   * query.onConflict(client.raw('(email) where active')).ignore()
   * ```
   */
  onConflict(
    columnsOrExpression?: string | string[] | RawExpressionBuilder
  ): ConflictExpressionBuilder {
    if (!columnsOrExpression) {
      return new ConflictExpressionBuilder(this, this.knexQuery.onConflict())
    }

    if (columnsOrExpression instanceof RawExpressionBuilder) {
      return new ConflictExpressionBuilder(
        this,
        this.knexQuery.onConflict(columnsOrExpression[TO_KNEX](this.knex))
      )
    }

    const columns = Array.isArray(columnsOrExpression)
      ? columnsOrExpression.map((column) => this.transformColumnName(column))
      : this.transformColumnName(columnsOrExpression)

    return new ConflictExpressionBuilder(this, this.knexQuery.onConflict(columns as any))
  }

  /**
   * Specify the columns to be returned after the insert query. Only
   * utilized by the PostgreSQL, SQLite and the MSSQL dialects.
   *
   * @example
   * ```ts
   * query.returning(['id'])
   * ```
   */
  returning(columns: string[]): this {
    this.knexQuery.returning(columns)
    return this
  }

  /**
   * Register a callback to get notified when a query is executed
   *
   * @example
   * ```ts
   * query.on('query', (sql) => console.log(sql))
   * ```
   */
  on(event: 'query', listener: (sql: Knex.Sql) => void): this

  /**
   * Register a callback to get notified with the query results
   *
   * @example
   * ```ts
   * query.on('query-response', (result, sql) => console.log(result, sql))
   * ```
   */
  on(
    event: 'query-response',
    listener: (result: any, sql: Knex.Sql & { response: any }) => void
  ): this
  on(
    event: 'query' | 'query-response',
    listener: (result: any, sql: Knex.Sql & { response: any }) => void
  ): this {
    this.knexQuery.on(event, listener)
    return this
  }

  /**
   * Execute the query.
   *
   * @example
   * ```ts
   * await query.exec()
   * ```
   */
  exec<T = any>(): Promise<T> {
    return this.client.exec<T>(this)
  }

  /**
   * Converts query to its SQL representation
   */
  toSQL() {
    return this.knexQuery.toSQL()
  }

  /**
   * Converts query to a compiled SQL string with inline
   * bindings
   */
  toString() {
    return this.knexQuery.toString()
  }

  /**
   * Converts query to its SQL representation that is sent to
   * the client for execution.
   */
  toNative() {
    return this.knexQuery.toSQL().toNative()
  }
}
