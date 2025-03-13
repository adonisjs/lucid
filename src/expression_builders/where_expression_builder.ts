/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import type {
  RawQueryBindings,
  WhereExpressionArguments,
  WhereInExpressionArguments,
  WhereNullExpressionArguments,
  WhereExistsExpressionArguments,
  WhereColumnExpressionArguments,
  WhereBetweenExpressionArguments,
  WhereJSONPathExpressionArguments,
  WhereJSONObjectExpressionArguments,
} from '../types/query.js'
import { WhereClauseTransformer } from '../transformers/where_clause.js'
import type { SharedExpressionBuilder } from './shared_expression_builder.js'

/**
 * WhereExpressionBuilder is used within the where groups to define
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
  where(...expression: WhereExpressionArguments): this {
    const [column, operator, value] = this.#whereTransformer.transformWhere(expression)

    const method = this.#grouping === 'or' ? 'orWhere' : 'where'
    if (operator && value !== undefined) {
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
  whereNot(...expression: WhereExpressionArguments): this {
    const [column, operator, value] = this.#whereTransformer.transformWhere(expression)

    const method = this.#grouping === 'or' ? 'orWhereNot' : 'whereNot'
    if (operator && value !== undefined) {
      this.knexQuery[method](column as any, operator, value)
    } else {
      this.knexQuery[method](column)
    }
    return this
  }

  /**
   * Apply a where clause to the SQL query comparing two columns with each
   * other
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The operator must be a string.
   * - The other column name must be a string value.
   *
   * @example
   * ```ts
   * exp.whereColumn('username', '=', 'email')
   * exp.whereColumn('upvotes', '>', 'downvotes')
   * ```
   */
  whereColumn(...expression: WhereColumnExpressionArguments): this {
    const [column, operator, value] = this.#whereTransformer.transformWhereColumn(expression)

    const method = this.#grouping === 'or' ? 'orWhere' : 'where'
    if (operator && value !== undefined) {
      this.knexQuery[method](column as any, operator, value)
    } else {
      this.knexQuery[method](column)
    }
    return this
  }

  /**
   * Apply a where NOT clause to the SQL query comparing two columns with each
   * other
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The operator must be a string.
   * - The other column name must be a string value.
   *
   * @example
   * ```ts
   * exp.whereNotColumn('username', '=', 'email')
   * exp.whereNotColumn('upvotes', '>', 'downvotes')
   * ```
   */
  whereNotColumn(...expression: WhereColumnExpressionArguments): this {
    const [column, operator, value] = this.#whereTransformer.transformWhereColumn(expression)

    const method = this.#grouping === 'or' ? 'orWhereNot' : 'whereNot'
    if (operator && value !== undefined) {
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
  whereIn(...expression: WhereInExpressionArguments): this {
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
  whereNotIn(...expression: WhereInExpressionArguments): this {
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
   * exp.whereJson('address', { city: 'Gurgaon' })
   * ```
   */
  whereJson(...expression: WhereJSONObjectExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereJsonObject' : 'whereJsonObject'
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery[method](column as any, value)
    return this
  }

  /**
   * Apply a where not equal clause on a JSON column. The `whereNotJson` accepts
   * the same set of arguments as the {@link WhereExpressionBuilder.whereJson}
   * method.
   */
  whereNotJson(...expression: WhereJSONObjectExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereNotJsonObject' : 'whereNotJsonObject'
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery[method](column as any, value)
    return this
  }

  /**
   * Apply a where clause on a JSON column where the column value is the subset
   * of the provided value. The value object will be stringified before
   * sending it to the client.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value can an object. Or it can be a {@link RefExpressionBuilder},
   *   {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a
   *   callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereJsonSubset('address', { city: 'Gurgaon' })
   * ```
   */
  whereJsonSubset(...expression: WhereJSONObjectExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereJsonSubsetOf' : 'whereJsonSubsetOf'

    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery[method](column as any, value)
    return this
  }

  /**
   * Apply a where clause on a JSON column where the column value is not the subset
   * of the provided value. The value object will be stringified before
   * sending it to the client.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value can an object. Or it can be a {@link RefExpressionBuilder},
   *   {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a
   *   callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereJsonNotSubset('address', { pincode: '122002' })
   * ```
   */
  whereJsonNotSubset(...expression: WhereJSONObjectExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereJsonNotSubsetOf' : 'whereJsonNotSubsetOf'

    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery[method](column as any, value)
    return this
  }

  /**
   * Apply a where clause on a JSON column where the column value is the superset
   * of the provided value. The value object will be stringified before
   * sending it to the client.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value can an object. Or it can be a {@link RefExpressionBuilder},
   *   {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a
   *   callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereJsonSuperset('address', { city: 'Gurgaon' })
   * ```
   */
  whereJsonSuperset(...expression: WhereJSONObjectExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereJsonSupersetOf' : 'whereJsonSupersetOf'

    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery[method](column as any, value)
    return this
  }

  /**
   * Apply a where clause on a JSON column where the column value is not the superset
   * of the provided value. The value object will be stringified before
   * sending it to the client.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value can an object. Or it can be a {@link RefExpressionBuilder},
   *   {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a
   *   callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereJsonNotSuperset('address', { pincode: '122002' })
   * ```
   */
  whereJsonNotSuperset(...expression: WhereJSONObjectExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereJsonNotSupersetOf' : 'whereJsonNotSupersetOf'

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
  whereJsonPath(...expression: WhereJSONPathExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereJsonPath' : 'whereJsonPath'

    const [column, jsonPath, operator, value] =
      this.#whereTransformer.transformWhereJsonPath(expression)
    this.knexQuery[method](column as any, jsonPath, operator, value)
    return this
  }

  /**
   * Apply where null clause to the SQL. The column name can be a string
   * value, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereNull('deleted_at')
   * exp.whereNull(db.raw(`??->>??`, ['address', 'city']))
   * ```
   */
  whereNull(...expression: WhereNullExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereNull' : 'whereNull'
    const [column] = this.#whereTransformer.transformWhereNull(expression)
    this.knexQuery[method](column as any)
    return this
  }

  /**
   * Apply where NOT null clause to the SQL. The column name can be a string
   * value, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereNotNull('deleted_at')
   * exp.whereNotNull(db.raw(`??->>??`, ['address', 'city']))
   * ```
   */
  whereNotNull(...expression: WhereNullExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereNotNull' : 'whereNotNull'
    const [column] = this.#whereTransformer.transformWhereNull(expression)
    this.knexQuery[method](column as any)
    return this
  }

  /**
   * Apply where exists clause to the SQL query. The subquery can be specified
   * as a {@link SelectExpressionBuilder}, {@link RawExpressionBuilder}, or
   * a callback that receives the {@link SelectExpressionBuilder}
   *
   * @example
   * ```ts
   * exp.whereExists((q) => {
   *   q.from('profiles').whereColumn('profiles.user_id', 'users.id')
   * })
   * ```
   */
  whereExists(...expression: WhereExistsExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereExists' : 'whereExists'
    const knexExpression = this.#whereTransformer.transformWhereExists(expression)
    this.knexQuery[method](knexExpression as any)
    return this
  }

  /**
   * Apply where not exists clause to the SQL query. The subquery can be specified
   * as a {@link SelectExpressionBuilder}, {@link RawExpressionBuilder}, or
   * a callback that receives the {@link SelectExpressionBuilder}
   *
   * @example
   * ```ts
   * exp.whereNotExists((q) => {
   *   q.from('profiles').whereColumn('profiles.user_id', 'users.id')
   * })
   * ```
   */
  whereNotExists(...expression: WhereExistsExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereNotExists' : 'whereNotExists'
    const knexExpression = this.#whereTransformer.transformWhereExists(expression)
    this.knexQuery[method](knexExpression as any)
    return this
  }

  /**
   * Apply where between clause to the SQL query. The following column and value
   * combinations can be supplied.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value must be a tuple with two items. Each tuple element can be
   *   a string, number, boolean, Date, and buffer. Or it can be a {@link RefExpressionBuilder}, {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereBetween('age', [18, 60])
   *
   * // Get all sales made during promotion
   * exp.whereBetween('created_at', [
   *   (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
   *   (q) => q.from('promotions').select('ended_at').where('promotion_id', 1)
   * ])
   * ```
   */
  whereBetween(...expression: WhereBetweenExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereBetween' : 'whereBetween'
    const [column, values] = this.#whereTransformer.transformWhereBetween(expression)
    this.knexQuery[method](column as any, values)
    return this
  }

  /**
   * Apply where not between clause to the SQL query. The following column and value
   * combinations can be supplied.
   *
   * - Column name can be a string, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   * - The value must be a tuple with two items. Each tuple element can be
   *   a string, number, boolean, Date, and buffer. Or it can be a {@link RefExpressionBuilder}, {@link RawExpressionBuilder}, {@link SelectExpressionBuilder}, or a callback function that receives an instance of the {@link SelectExpressionBuilder}.
   *
   * @example
   * ```ts
   * exp.whereNotBetween('age', [0, 10])
   *
   * // Get all sales exlcuding promotion days
   * exp.whereNotBetween('created_at', [
   *   (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
   *   (q) => q.from('promotions').select('ended_at').where('promotion_id', 1)
   * ])
   * ```
   */
  whereNotBetween(...expression: WhereBetweenExpressionArguments): this {
    const method = this.#grouping === 'or' ? 'orWhereNotBetween' : 'whereNotBetween'
    const [column, values] = this.#whereTransformer.transformWhereBetween(expression)
    this.knexQuery[method](column as any, values)
    return this
  }

  /**
   * Specify a where clause as a raw SQL query.
   *
   * @example
   * ```ts
   * exp.whereRaw(`??->>'city' = ?`, ['address', 'Gurgaon'])
   * ```
   */
  whereRaw(sql: string, bindings?: RawQueryBindings): this {
    const method = this.#grouping === 'or' ? 'orWhereRaw' : 'whereRaw'
    this.knexQuery[method](sql, bindings)
    return this
  }

  /**
   * Define a where group that will apply the `OR` operator to all
   * the where clauses defined within the callback.
   *
   * @example
   * ```ts
   * exp.or((exp) => {
   *   exp.where('username', 'virk').where('username', 'romain')
   * })
   * // SELECT * users WHERE (username = 'virk' or username = 'romain')
   * ```
   */
  or(callback: (expressionBuilder: WhereExpressionBuilder) => void): this {
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
   * query.and((exp) => {
   *   exp.where('username', 'virk').where('is_active', true)
   * })
   * // SELECT * users WHERE (username = 'virk' AND is_active = true)
   * ```
   */
  and(callback: (expressionBuilder: WhereExpressionBuilder) => void): this {
    this.knexQuery.where((subQuery) => {
      const expressionBuilder = new WhereExpressionBuilder(this.parent, this.knex, subQuery, 'and')
      callback(expressionBuilder)
    })
    return this
  }
}
