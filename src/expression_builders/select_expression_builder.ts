/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import * as errors from '../errors.js'

import { isPlainObject, transformValueExpressions } from '../helpers.js'
import { SharedExpressionBuilder } from './shared_expression_builder.js'
import type {
  SelectExpressions,
  DatabaseClientContract,
  FromExpressionArguments,
  OrderByExpressionArguments,
} from '../types/query.js'

export class SelectExpressionBuilder extends SharedExpressionBuilder {
  constructor(protected client: DatabaseClientContract) {
    super(client.getReadClient())
  }

  /**
   * Transforms the select expression to a knex compatible value.
   */
  #transformSelectExpression(column: SelectExpressions) {
    /**
     * String based column names will be transformed using the
     * "transformColumnName" method
     */
    if (typeof column === 'string') {
      return this.transformColumnName(column)
    }

    /**
     * Converting an object with aliases to knex compatible object
     */
    if (isPlainObject<Record<string, SelectExpressions>>(column)) {
      return Object.keys(column).reduce<Record<string, string | Knex.QueryBuilder>>(
        (result, key) => {
          result[key] = this.#transformSelectExpression(column[key]) as string | Knex.QueryBuilder
          return result
        },
        {}
      )
    }

    /**
     * Transforming value expressions to knex compatible expressions
     */
    const transformedValue = transformValueExpressions(column, this, this.knex)
    if (!transformedValue) {
      throw new errors.E_INVALID_SQL_EXPRESSION([column, 'select'])
    }

    return transformedValue
  }

  /**
   * Transforms the from expression a value that is acceptable
   * by Knex
   */
  #transformFromExpression(table: FromExpressionArguments[0]) {
    if (typeof table === 'string') {
      return table
    }

    if (Array.isArray(table)) {
      return table.reduce<Record<string, string>>((result, tableIdentifier) => {
        result[tableIdentifier] = tableIdentifier
        return result
      }, {})
    }

    /**
     * Transforming value expressions to knex compatible expressions
     */
    const transformedValue = transformValueExpressions(table, this, this.knex)
    if (!transformedValue) {
      throw new errors.E_INVALID_SQL_EXPRESSION([table, 'from'])
    }

    return transformedValue
  }

  /**
   * Returns an instance of the {@link SelectExpressionBuilder}
   */
  createSelectSubQuery() {
    return new SelectExpressionBuilder(this.client)
  }

  /**
   * Select one or more columns from a given table. The columns
   * can be represented as one of the following values.
   *
   * - A string value represents the column name. "email".
   * - A string value can also represent a column name + alias. "email as e".
   * - Use {@link SelectExpressionBuilder} to select columns from a subquery.
   * - Use {@link RawExpressionBuilder} to select columns from raw a SQL expression.
   * - Use {@link RefExpressionBuilder} to specify a formatted column name.
   * - Or a callback that receives a new instance of the {@link SelectExpressionBuilder}
   *
   * @example
   * ```ts
   * // Select email
   * query.select('email')
   *
   * // Select email as e
   * query.select('email as e')
   *
   * // Select from a sub-query
   * query.from('users').select(
   *   db
   *    .query()
   *    .from('profiles')
   *    .select('profiles.email')
   *    .where('users.id', '=', 'profiles.user_id')
   *    .limit(1)
   *    .as('profile_email')
   * )
   *
   * // Create subquery on the fly using a callback
   * query.from('users').select((subquery) => {
   *   subquery
   *    .from('profiles')
   *    .select('profiles.email')
   *    .where('users.id', '=', 'profiles.user_id')
   *    .limit(1)
   *    .as('profile_email')
   * })
   *
   * // Define aliases for all columns
   * query.from('users').select({
   *   profile_email: db
   *      .query()
   *      .from('profiles')
   *      .select('profiles.email')
   *      .where('users.id', '=', 'profiles.user_id')
   *      .limit(1)
   *   user_id: 'id',
   * })
   * ```
   */
  select(...columns: SelectExpressions[]): this
  select(columns: SelectExpressions[]): this
  select(...columns: SelectExpressions[] | [SelectExpressions[]]): this {
    this.knexQuery.select(
      columns.flatMap((column) => {
        if (Array.isArray(column)) {
          return column.map((c) => this.#transformSelectExpression(c))
        }
        return this.#transformSelectExpression(column)
      })
    )
    return this
  }

  /**
   * Clear all selected columns
   */
  clearSelect() {
    this.knexQuery.clearSelect()
    return this
  }

  /**
   * Define the table for selection. The table can be represented
   * as one of the following values.
   *
   * - A string value represents the table name. "users".
   * - A string value can also represent a table name + alias. "users as u".
   * - Specify {@link SelectExpressionBuilder} to select columns from a subquery.
   * - Use {@link RawExpressionBuilder} to select columns from a raw SQL expression.
   * - Or a callback that receives a new instance of the {@link SelectExpressionBuilder}
   */
  from(...expression: FromExpressionArguments): this {
    this.knexQuery.from(this.#transformFromExpression(expression[0]))
    return this
  }

  /**
   * Apply offset to the SQL query. When "options.skipBinding" option is
   * provided, then the offset will be inlined in the query instead of
   * using a prepared value
   */
  offset(offset: number, options?: { skipBinding: boolean }): this {
    this.knexQuery.offset(offset, options)
    return this
  }

  /**
   * Apply limit to the SQL query. When "options.skipBinding" option is
   * provided, then the limit will be inlined in the query instead of
   * using a prepared value
   */
  limit(limit: number, options?: { skipBinding: boolean }): this {
    this.knexQuery.limit(limit, options)
    return this
  }

  orderBy(...expression: OrderByExpressionArguments): this {
    /**
     * The arguments are provided as "columnName", "direction"
     */
    if (typeof expression[0] === 'string') {
      this.knexQuery.orderBy(this.transformColumnName(expression[0]), expression[1])
      return this
    }

    /**
     * The arguments are provided as an array of column strings or array of objects.
     */
    if (Array.isArray(expression[0])) {
      const toKnex = expression[0].map((value) => {
        if (typeof value === 'string') {
          return this.transformColumnName(value)
        }

        const transformedColumn =
          typeof value.column === 'string'
            ? this.transformColumnName(value.column)
            : transformValueExpressions(value.column, this, this.knex)

        if (!transformedColumn) {
          throw new errors.E_INVALID_SQL_EXPRESSION([value.column, 'orderBy'])
        }

        return {
          ...value,
          column: transformedColumn,
        }
      })

      // @ts-expect-error "Raw queries are allowed but knex types refuses to accept it"
      this.knexQuery.orderBy(toKnex)
      return this
    }

    /**
     * The arguments are provided as "columnName as QueryExpressionsValue", "direction"
     */
    const transformedColumn = transformValueExpressions(expression[0], this, this.knex)
    if (!transformedColumn) {
      throw new errors.E_INVALID_SQL_EXPRESSION([expression[0], 'orderBy'])
    }

    // @ts-expect-error "Raw queries are allowed but knex types refuses to accept it"
    this.knexQuery.orderBy(transformedColumn, expression[1])
    return this
  }

  /**
   * Define an alias for the subquery. Ignored on the main
   * query.
   */
  as(alias: string): this {
    this.knexQuery.as(alias)
    return this
  }
}
