/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import type {
  WhereExpressionArguments,
  WhereInExpressionArguments,
  WhereJSONObjectExpressionArguments,
  WhereJSONPathExpressionArguments,
} from '../types/query.js'
import { WhereClauseTransformer } from '../transformers/where_clause.js'
import type { SharedExpressionBuilder } from './shared_expression_builder.js'

/**
 * WhereExpression builder is used within the where groups to define
 * where clauses on the SQL query.
 */
export class WhereExpressionBuilder {
  #grouping: 'or' | 'and'
  #whereTransformer: WhereClauseTransformer

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

  constructor(
    protected parent: SharedExpressionBuilder,
    protected knex: Knex,
    public knexQuery: Knex.QueryBuilder,
    grouping: 'or' | 'and'
  ) {
    this.#grouping = grouping
    this.#whereTransformer = new WhereClauseTransformer(this, this.knex)
  }

  /**
   * Apply a where clause to the SQL query. The following column, operator and value
   * combinations can be supplied.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The operator must be a string.
   * - The value can be a string, number, boolean, Date, buffer,  {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a callback function that
   * receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.where('username', 'virk')
   * exp.where('username', '!=', 'virk')
   *
   * exp.where('role', (q) => q.select('name').from('roles').where('id', roleId))
   * exp.where('lottery_number', client
   *    .raw('select ?? from ?? where ?? = ?', ['ticket_number', 'lotteries', 'status', 'won'])
   *    .wrap('(', ')')
   * )
   *
   * exp.where({
   *   username: 'virk',
   *   is_active: true,
   * })
   * ```
   */
  where(...expression: WhereExpressionArguments) {
    const [column, operator, value] = this.#whereTransformer.transformWhere(expression)

    const method = this.#grouping === 'or' ? 'orWhere' : 'where'
    if (operator && value) {
      this.knexQuery[method](column as any, operator, value)
    } else {
      this.knexQuery[method](column)
    }
    return this
  }

  /**
   * Apply a where not clause to the SQL query. The `whereNot` accepts
   * the same set of arguments as the {@link WhereExpressionBuilder.where}
   * method.
   */
  whereNot(...expression: WhereExpressionArguments) {
    const [column, operator, value] = this.#whereTransformer.transformWhere(expression)

    const method = this.#grouping === 'or' ? 'orWhereNot' : 'whereNot'
    if (operator && value) {
      this.knexQuery[method](column as any, operator, value)
    } else {
      this.knexQuery[method](column)
    }
    return this
  }

  /**
   * Apply a where in clause to the SQL query. The following column and value
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
   * exp.whereIn('username', ['virk', 'romain'])
   * exp.whereIn(['username', 'email'], [
   *   ['virk', 'virk@adonisjs.com'],
   *   ['romain', 'romain@adonisjs.com']
   * ])
   *
   * exp.whereIn('country_code', (q) => {
   *   q.select('country_code').from('countries').where('is_active', true)
   * })
   * ```
   */
  whereIn(...expression: WhereInExpressionArguments) {
    const method = this.#grouping === 'or' ? 'orWhereIn' : 'whereIn'
    const [column, value] = this.#whereTransformer.transformWhereIn(expression)
    this.knexQuery[method](column as any, value as any)
    return this
  }

  /**
   * Apply a where not in clause to the SQL query. The `whereNotIn` accepts
   * the same set of arguments as the {@link WhereExpressionBuilder.whereIn}
   * method.
   */
  whereNotIn(...expression: WhereInExpressionArguments) {
    const method = this.#grouping === 'or' ? 'orWhereNotIn' : 'whereNotIn'
    const [column, value] = this.#whereTransformer.transformWhereIn(expression)
    this.knexQuery[method](column as any, value as any)
    return this
  }

  /**
   * Apply a where equal clause on a JSON column. The value object will be
   * stringified before sending it to the client.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value can an object. Or it can be a {@link RefExpressionBuilder},
   *   {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a
   *   callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereJsonObject('address', { city: 'Gurgaon' })
   * ```
   */
  whereJsonObject(...expression: WhereJSONObjectExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereJsonObject' : 'whereJsonObject'
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery[method](column as any, value)
    return this
  }

  /**
   * Apply a where not equal clause on a JSON column. The `whereNotJsonObject` accepts
   * the same set of arguments as the {@link WhereExpressionBuilder.whereJsonObject}
   * method.
   */
  whereNotJsonObject(...expression: WhereJSONObjectExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereNotJsonObject' : 'whereNotJsonObject'
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery[method](column as any, value)
    return this
  }

  /**
   * Apply where a clause on a JSON column property. The following column and value
   * combinations can be supplied.
   *
   * - The column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The jsonPath arguments must be a string.
   * - The operator must be a string.
   * - The value can be any value that can be stringified to a JSON object. Or it can be
   *   a {@link RefExpressionBuilder}, {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a callback that receives {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereJsonPath('address', '$.city', '=', 'Gurgaon')
   * ```
   */
  whereJsonPath(...expression: WhereJSONPathExpressionArguments) {
    const method = this.#grouping === 'or' ? 'orWhereJsonPath' : 'whereJsonPath'

    const [column, jsonPath, operator, value] =
      this.#whereTransformer.transformWhereJsonPath(expression)
    this.knexQuery[method](column as any, jsonPath, operator, value)
    return this
  }

  /**
   * Define a where group that will apply the `OR` operator to all
   * the where clauses defined within the callback.
   *
   * @example
   * ```ts
   * exp.orWhereGroup((exp) => {
   *   exp.where('username', 'virk').where('username', 'romain')
   * })
   * // SELECT * users WHERE (username = 'virk' or username = 'romain')
   * ```
   */
  orWhereGroup(callback: (expressionBuilder: WhereExpressionBuilder) => void): this {
    this.knexQuery.where((subQuery) => {
      const expressionBuilder = new WhereExpressionBuilder(this.parent, this.knex, subQuery, 'or')
      callback(expressionBuilder)
    })
    return this
  }

  /**
   * Define a where group that will apply the `AND` operator to all
   * the where clauses defined within the callback.
   *
   * @example
   * ```ts
   * query.andWhereGroup((exp) => {
   *   exp.where('username', 'virk').where('is_active', true)
   * })
   * // SELECT * users WHERE (username = 'virk' AND is_active = true)
   * ```
   */
  andWhereGroup(callback: (expressionBuilder: WhereExpressionBuilder) => void): this {
    this.knexQuery.where((subQuery) => {
      const expressionBuilder = new WhereExpressionBuilder(this.parent, this.knex, subQuery, 'and')
      callback(expressionBuilder)
    })
    return this
  }
}
