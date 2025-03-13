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
import type {
  OnExpressionArguments,
  OnInExpressionArguments,
  OnNullExpressionArguments,
  OnValueExpressionArguments,
  OnExistsExpressionArguments,
  OnBetweenExpressionArguments,
} from '../types/query.js'
import { transformValueExpressions } from '../helpers.js'
import { RawExpressionBuilder } from './raw_expression_builder.js'
import type { SharedExpressionBuilder } from './shared_expression_builder.js'

/**
 * JoinExpressionBuilder allows defining the "ON" clauses for a SQL
 * join.
 */
export class JoinExpressionBuilder {
  #grouping: 'or' | 'and'

  constructor(
    protected parent: SharedExpressionBuilder,
    protected knex: Knex,
    public knexQuery: Knex.JoinClause,
    grouping: 'or' | 'and'
  ) {
    this.#grouping = grouping
  }

  /**
   * Function to create a new select subquery builder.
   */
  createSelectSubQuery() {
    return this.parent.createSelectSubQuery()
  }

  /**
   * Function to transform column names as they are used by different
   * query methods like "where", "select", "orderBy" and so on.
   */
  transformColumnName(columnName: string) {
    return this.parent.transformColumnName(columnName)
  }

  /**
   * Specify ON condition for the JOIN clause. The columns can be specified
   * as a string value, {@link RawExpressionBuilder}, or as {@link RefExpressionBuilder}
   *
   * @example
   * ```ts
   * join.on('profiles.user_id', 'users.id')
   * join.on('exams.score', '>', 'qualifying_scores.min_score')
   * ```
   */
  on(...expression: OnExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOn' : 'on'

    let primaryColumn = expression[0]
    let operator = expression[1]
    let secondaryColumn = expression[2]

    /**
     * When secondaryColumn is not defined, we consider operator as the
     * secondary column and set the operator to `=`.
     */
    if (!secondaryColumn) {
      secondaryColumn = operator
      operator = '='
    }

    /**
     * If operator and secondary column are still missing, then we will throw
     * an Error.
     */
    if (!operator || !secondaryColumn) {
      throw new errors.E_INVALID_SQL_EXPRESSION([primaryColumn, 'join.on'])
    }

    /**
     * Invoke knex on method. Since knex uses overloads, passing a union
     * of arguments results in a TypeScript error
     */
    this.knexQuery[method](
      // @ts-expect-error
      transformValueExpressions(primaryColumn, this, this.knex) ?? primaryColumn,
      operator,
      transformValueExpressions(secondaryColumn, this, this.knex) ?? secondaryColumn
    )

    return this
  }

  /**
   * Specify ON condition for the JOIN clause. The value parameter (2nd or 3rd) must be
   * a literal value against which the column value will be compared.
   *
   * The column name can be specified as a string value, {@link RawExpressionBuilder}, or as {@link RefExpressionBuilder}
   *
   * @example
   * ```ts
   * join.onValue('profiles.user_id', 1)
   * join.onValue('exams.score', '>', 33)
   * join.onValue('profiles.is_admin', '=', false)
   * ```
   */
  onValue(...expression: OnValueExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnVal' : 'onVal'

    let primaryColumn = expression[0]
    let operator = expression[1]
    let value = expression[2]

    /**
     * When value is not defined, we consider operator as the
     * value and set the operator to `=`.
     */
    if (value === undefined) {
      value = operator
      operator = '='
    }

    /**
     * If operator and value are still missing, then we will throw
     * an Error.
     */
    if (operator === undefined || value === undefined) {
      throw new errors.E_INVALID_SQL_EXPRESSION([primaryColumn, 'join.onValue'])
    }

    /**
     * Invoke knex on method. Since knex uses overloads, passing a union
     * of arguments results in a TypeScript error
     */
    this.knexQuery[method](
      // @ts-expect-error
      transformValueExpressions(primaryColumn, this, this.knex) ?? primaryColumn,
      operator,
      value
    )

    return this
  }

  /**
   * Apply an on in clause to the SQL query. The following column and value
   * combinations can be supplied.
   *
   * - Column name can be a string, an array of strings, {@link RefExpressionBuilder},
   *   or the {@link RawExpressionBuilder}.
   * - The value can be an array of string, number, boolean, Date, and buffer. Or it can
   *   be a {@link RefExpressionBuilder}, {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a callback function that receives an instance
   *  of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * join.onIn('username', ['virk', 'romain'])
   * join.onIn(['username', 'email'], [
   *   ['virk', 'virk@adonisjs.com'],
   *   ['romain', 'romain@adonisjs.com']
   * ])
   *
   * join.onIn('country_code', (q) => {
   *   q.select('country_code').from('countries').where('is_active', true)
   * })
   * ```
   */
  onIn(...expression: OnInExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnIn' : 'onIn'

    const column = transformValueExpressions(expression[0], this, this.knex) ?? expression[0]
    const value = transformValueExpressions(expression[1], this, this.knex) ?? expression[1]

    this.knexQuery[method](column as any, value as any)
    return this
  }

  /**
   * Apply an on not in clause to the SQL query. The `onNotIn` accepts
   * the same set of arguments as the {@link JoinExpressionBuilder.onIn}
   * method.
   */
  onNotIn(...expression: OnInExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnNotIn' : 'onNotIn'

    const column = transformValueExpressions(expression[0], this, this.knex) ?? expression[0]
    const value = transformValueExpressions(expression[1], this, this.knex) ?? expression[1]

    this.knexQuery[method](column as any, value as any)
    return this
  }

  /**
   * Apply on between condition to the JOIN clause. The following column and value
   * combinations can be supplied.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value must be a tuple with two items. Each tuple element can be
   *   a string, number, boolean, Date, and buffer. Or it can be a {@link RefExpressionBuilder}, {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * join.onBetween('contacts.id', [10, 3000])
   *
   * // Get all sales made during promotion
   * join.onBetween('sales.created_at', [
   *   (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
   *   (q) => q.from('promotions').select('ended_at').where('promotion_id', 1)
   * ])
   * ```
   */
  onBetween(...expression: OnBetweenExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnBetween' : 'onBetween'

    const column = transformValueExpressions(expression[0], this, this.knex) ?? expression[0]
    const values = [
      transformValueExpressions(expression[1][0], this, this.knex) ?? expression[1][0],
      transformValueExpressions(expression[1][1], this, this.knex) ?? expression[1][1],
    ] as const

    this.knexQuery[method](column as any, values as any)
    return this
  }

  /**
   * Apply on NOT between condition to the JOIN clause. The following column and value
   * combinations can be supplied.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value must be a tuple with two items. Each tuple element can be
   *   a string, number, boolean, Date, and buffer. Or it can be a {@link RefExpressionBuilder}, {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * join.onNotBetween('contacts.id', [0, 100])
   *
   * // Get all sales exlcuding promotion days
   * join.onNotBetween('sales.created_at', [
   *   (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
   *   (q) => q.from('promotions').select('ended_at').where('promotion_id', 1)
   * ])
   * ```
   */
  onNotBetween(...expression: OnBetweenExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnNotBetween' : 'onNotBetween'

    const column = transformValueExpressions(expression[0], this, this.knex) ?? expression[0]
    const values = [
      transformValueExpressions(expression[1][0], this, this.knex) ?? expression[1][0],
      transformValueExpressions(expression[1][1], this, this.knex) ?? expression[1][1],
    ] as const

    this.knexQuery[method](column as any, values as any)
    return this
  }

  /**
   * Specify ON condition for the JOIN clause as a raw query
   *
   * @example
   * ```ts
   * join.onRaw(client.raw('?? = ??', ['profiles.user_id', 'users.id']))
   * ```
   */
  onRaw(expression: RawExpressionBuilder): this {
    const method = this.#grouping === 'or' ? 'orOn' : 'on'
    const transformedValue = transformValueExpressions(expression, this, this.knex)
    if (!transformedValue) {
      throw new errors.E_INVALID_SQL_EXPRESSION([expression, 'onRaw'])
    }

    this.knexQuery[method](transformedValue)
    return this
  }

  /**
   * Specify ON NULL condition for the JOIN clause. The column can be specified
   * as a string value, {@link RawExpressionBuilder}, or as {@link RefExpressionBuilder}
   *
   * @example
   * ```ts
   * join.onNull('profiles.deleted_at')
   * ```
   */
  onNull(...expression: OnNullExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnNull' : 'onNull'
    this.knexQuery[method](
      (transformValueExpressions(expression[0], this, this.knex) ?? expression[0]) as any
    )

    return this
  }

  /**
   * Specify ON NOT NULL condition for the JOIN clause. The column can be specified
   * as a string value, {@link RawExpressionBuilder}, or as {@link RefExpressionBuilder}
   *
   * @example
   * ```ts
   * join.onNotNull('profiles.user_id')
   * ```
   */
  onNotNull(...expression: OnNullExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnNotNull' : 'onNotNull'
    this.knexQuery[method](
      (transformValueExpressions(expression[0], this, this.knex) ?? expression[0]) as any
    )

    return this
  }

  /**
   * Specify ON EXISTS condition for the JOIN clause. The subquery can be specified
   * as a {@link SelectExpressionBuilder}, {@link RawExpressionBuilder}, or
   * a callback that receives the {@link SelectExpressionBuilder}
   *
   * @example
   * ```ts
   * join.onExists((q) => {
   *   q.from('profiles').whereColumn('profiles.user_id', 'users.id')
   * })
   * ```
   */
  onExists(...expression: OnExistsExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnExists' : 'onExists'
    const knexExpression = transformValueExpressions(expression[0], this, this.knex)
    this.knexQuery[method](knexExpression as any)
    return this
  }

  /**
   * Specify ON NOT EXISTS condition for the JOIN clause. The subquery can be specified
   * as a {@link SelectExpressionBuilder}, {@link RawExpressionBuilder}, or
   * a callback that receives the {@link SelectExpressionBuilder}
   *
   * @example
   * ```ts
   * join.onNotExists((q) => {
   *   q.from('profiles').whereColumn('profiles.user_id', 'users.id')
   * })
   * ```
   */
  onNotExists(...expression: OnExistsExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orOnNotExists' : 'onNotExists'
    const knexExpression = transformValueExpressions(expression[0], this, this.knex)
    this.knexQuery[method](knexExpression as any)
    return this
  }

  /**
   * Define an on group that will apply the `OR` operator to all
   * the ON clauses defined within the callback.
   *
   * @example
   * ```ts
   * join.or((exp) => {
   *   exp.on('profiles.user_id', 'users.id').onNull('profiles.user_id')
   * })
   * ```
   */
  or(callback: (joinExpression: JoinExpressionBuilder) => void): this {
    this.knexQuery.on((subJoinClause) => {
      callback(new JoinExpressionBuilder(this.parent, this.knex, subJoinClause, 'or'))
    })
    return this
  }

  /**
   * Define an on group that will apply the `AND` operator to all
   * the ON clauses defined within the callback.
   *
   * @example
   * ```ts
   * join.and((exp) => {
   *   exp.on('profiles.user_id', 'users.id').onNull('profiles.deleted_at')
   * })
   * ```
   */
  and(callback: (joinExpression: JoinExpressionBuilder) => void): this {
    this.knexQuery.on((subJoinClause) => {
      callback(new JoinExpressionBuilder(this.parent, this.knex, subJoinClause, 'and'))
    })
    return this
  }
}
