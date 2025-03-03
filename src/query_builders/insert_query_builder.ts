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
import type { DatabaseClientContract, QueryBuilderValueExpressions } from '../types/query.js'
import { ConflictExpressionBuilder } from '../expression_builders/conflict_expression_builder.js'

export class InsertQueryBuilder {
  #tableName?: string

  protected knex: Knex
  protected knexQuery: Knex.QueryBuilder

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
      if (!transformedValue) {
        result[this.transformColumnName(key)] = value
      } else {
        result[this.transformColumnName(key)] = transformedValue
      }
      return result
    }, {})
  }

  /**
   * Function to transform column names as they are used by different
   * query methods like "where", "select", "orderBy" and so on.
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
   * query.insert({
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
  insert(
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
   * Define the columns for the insert query and pick values using a subquery
   * or a raw query.
   *
   * @example
   * ```ts
   * query
   *   .table('expired_tokens')
   *   .insertUsing(['token', 'user_id', 'expires_at'], (query) => {
   *     query
   *       .select('token', 'user_id', 'expires_at')
   *       .where('expires_at', '<=', client.raw('now()'))
   *   })
   * ```
   */
  insertUsing(
    columns: string[],
    query: QueryBuilderValueExpressions,
    options?: {
      includeTriggerModifications: boolean
    }
  ): this {
    this.knexQuery.into(
      this.knex.raw(`?? (${columns.map(() => `??`).join(', ')})`, [this.#tableName, ...columns])
    )

    const transformedValue = transformValueExpressions(query, this, this.knex)
    if (!transformedValue) {
      throw new errors.E_INVALID_SQL_EXPRESSION([query, 'insertUsing'])
    }

    this.knexQuery.insert(transformedValue, [], options)
    return this
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
   * Execute the query.
   *
   * @example
   * ```ts
   * await query.exec()
   * ```
   */
  async exec() {
    const result = await this.knexQuery
    return result
  }
}
