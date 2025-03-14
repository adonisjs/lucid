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
  JoinExpressionArguments,
  WhereExpressionArguments,
  WhereInExpressionArguments,
  WhereNullExpressionArguments,
  QueryBuilderValueExpressions,
  WhereExistsExpressionArguments,
  WhereBetweenExpressionArguments,
  WhereJSONPathExpressionArguments,
  WhereJSONObjectExpressionArguments,
  WhereColumnExpressionArguments,
} from '../types/query.js'

import * as errors from '../errors.js'
import { transformValueExpressions } from '../helpers.js'
import { RefExpressionBuilder } from './ref_expression_builder.js'
import { RawExpressionBuilder } from './raw_expression_builder.js'
import { JoinExpressionBuilder } from './join_expression_builder.js'
import { WhereExpressionBuilder } from './where_expression_builder.js'
import { WhereClauseTransformer } from '../transformers/where_clause.js'
import type { SelectExpressionBuilder } from './select_expression_builder.js'

/**
 * The SharedExpressionBuilder class encapsulates the API methods shared between
 * the select and the update queries for the sake of not duplicating them.
 */
export abstract class SharedExpressionBuilder {
  #whereTransformer: WhereClauseTransformer

  /**
   * Reference to the underlying knex query builder.
   */
  knexQuery: Knex.QueryBuilder

  constructor(protected knex: Knex) {
    this.knexQuery = knex.queryBuilder()
    this.#whereTransformer = new WhereClauseTransformer(this, this.knex)
  }

  /**
   * Implement the method to create a select expression builder
   * for running sub-queries
   */
  abstract createSelectSubQuery(): SelectExpressionBuilder

  /**
   * Applies SQL join after transforming Lucid values to knex values
   */
  protected applyJoin(
    expression: JoinExpressionArguments,
    joinMethod:
      | 'innerJoin'
      | 'join'
      | 'leftJoin'
      | 'leftOuterJoin'
      | 'rightJoin'
      | 'rightOuterJoin'
      | 'fullOuterJoin'
      | 'crossJoin'
  ) {
    /**
     * When there are only two arguments and the 2nd argument is a function,
     * we consider it as a callback to configure the inner join via
     * join expression builder
     */
    if (expression.length === 2 && typeof expression[1] === 'function') {
      this.knexQuery[joinMethod](
        transformValueExpressions(expression[0], this, this.knex) ?? (expression[0] as string),
        (joinClause) => {
          expression[1](new JoinExpressionBuilder(this, this.knex, joinClause, 'and'))
        }
      )
      return this
    }

    let table = expression[0] as string | QueryBuilderValueExpressions
    let primaryColumn = expression[1] as string | RefExpressionBuilder | RawExpressionBuilder
    let secondaryColumn = expression[3] === undefined ? expression[2] : expression[3]
    let operator = expression[3] === undefined ? '=' : (expression[2] as string)

    /**
     * If operator and secondary column are still missing, then we will throw
     * an Error.
     */
    if (!operator || !secondaryColumn) {
      throw new errors.E_INVALID_SQL_EXPRESSION([primaryColumn, 'join'])
    }

    /**
     * Invoke knex join method. Since knex uses overloads, passing a union
     * of arguments results in a TypeScript error
     */
    this.knexQuery[joinMethod](
      transformValueExpressions(table, this, this.knex) ?? (table as string),
      (joinClause) => {
        const joinExpression = new JoinExpressionBuilder(this, this.knex, joinClause, 'and')
        joinExpression.on(primaryColumn, operator, secondaryColumn)
      }
    )

    return this
  }

  /**
   * Function to transform column names as they are used by different
   * query methods like "where", "select", "orderBy" and so on.
   */
  transformColumnName(key: string): string {
    return key
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
   * query.where('username', 'virk')
   * query.where('username', '!=', 'virk')
   *
   * query.where('role', (q) => q.select('name').from('roles').where('id', roleId))
   * query.where('lottery_number', client
   *    .raw('select ?? from ?? where ?? = ?', ['ticket_number', 'lotteries', 'status', 'won'])
   *    .wrap('(', ')')
   * )
   *
   * query.where({
   *   username: 'virk',
   *   is_active: true,
   * })
   * ```
   */
  where(...expression: WhereExpressionArguments): this {
    const [column, operator, value] = this.#whereTransformer.transformWhere(expression)
    if (operator && value !== undefined) {
      this.knexQuery.where(column as any, operator, value)
    } else {
      this.knexQuery.where(column)
    }
    return this
  }

  /**
   * Apply a where not clause to the SQL query. The `whereNot` accepts
   * the same set of arguments as the {@link SharedExpressionBuilder.where}
   * method.
   */
  whereNot(...expression: WhereExpressionArguments) {
    const [column, operator, value] = this.#whereTransformer.transformWhere(expression)
    if (operator && value !== undefined) {
      this.knexQuery.whereNot(column as any, operator, value)
    } else {
      this.knexQuery.whereNot(column)
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
   * query.whereColumn('username', '=', 'email')
   * query.whereColumn('upvotes', '>', 'downvotes')
   * ```
   */
  whereColumn(...expression: WhereColumnExpressionArguments): this {
    const [column, operator, value] = this.#whereTransformer.transformWhereColumn(expression)

    if (operator && value !== undefined) {
      this.knexQuery.where(column as any, operator, value)
    } else {
      this.knexQuery.where(column)
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
   * query.whereNotColumn('username', '=', 'email')
   * query.whereNotColumn('upvotes', '>', 'downvotes')
   * ```
   */
  whereNotColumn(...expression: WhereColumnExpressionArguments): this {
    const [column, operator, value] = this.#whereTransformer.transformWhereColumn(expression)

    if (operator && value !== undefined) {
      this.knexQuery.whereNot(column as any, operator, value)
    } else {
      this.knexQuery.whereNot(column)
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
   * query.whereIn('username', ['virk', 'romain'])
   * query.whereIn(['username', 'email'], [
   *   ['virk', 'virk@adonisjs.com'],
   *   ['romain', 'romain@adonisjs.com']
   * ])
   *
   * query.whereIn('country_code', (q) => {
   *   q.select('country_code').from('countries').where('is_active', true)
   * })
   * ```
   */
  whereIn(...expression: WhereInExpressionArguments) {
    const [column, value] = this.#whereTransformer.transformWhereIn(expression)
    this.knexQuery.whereIn(column as any, value as any)
    return this
  }

  /**
   * Apply a where not in clause to the SQL query. The `whereNotIn` accepts
   * the same set of arguments as the {@link SharedExpressionBuilder.whereIn}
   * method.
   */
  whereNotIn(...expression: WhereInExpressionArguments): this {
    const [column, value] = this.#whereTransformer.transformWhereIn(expression)
    this.knexQuery.whereIn(column as any, value as any)
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
   * query.whereJson('address', { city: 'Gurgaon' })
   * ```
   */
  whereJson(...expression: WhereJSONObjectExpressionArguments): this {
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery.whereJsonObject(column as any, value)
    return this
  }

  /**
   * Apply a where not equal clause on a JSON column. The `whereNotJson` accepts
   * the same set of arguments as the {@link SharedExpressionBuilder.whereJson}
   * method.
   */
  whereNotJson(...expression: WhereJSONObjectExpressionArguments): this {
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery.whereNotJsonObject(column as any, value)
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
   * query.whereJsonSubset('address', { city: 'Gurgaon' })
   * ```
   */
  whereJsonSubset(...expression: WhereJSONObjectExpressionArguments): this {
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery.whereJsonSubsetOf(column as any, value)
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
   * query.whereJsonNotSubset('address', { pincode: '122002' })
   * ```
   */
  whereJsonNotSubset(...expression: WhereJSONObjectExpressionArguments): this {
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery.whereJsonNotSubsetOf(column as any, value)
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
   * query.whereJsonSuperset('address', { city: 'Gurgaon' })
   * ```
   */
  whereJsonSuperset(...expression: WhereJSONObjectExpressionArguments): this {
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery.whereJsonSupersetOf(column as any, value)
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
   * query.whereJsonNotSuperset('address', { pincode: '122002' })
   * ```
   */
  whereJsonNotSuperset(...expression: WhereJSONObjectExpressionArguments): this {
    const [column, value] = this.#whereTransformer.transformWhereJsonObject(expression)
    this.knexQuery.whereJsonNotSupersetOf(column as any, value)
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
   * query.whereJsonPath('address', '$.city', '=', 'Gurgaon')
   * ```
   */
  whereJsonPath(...expression: WhereJSONPathExpressionArguments): this {
    const [column, jsonPath, operator, value] =
      this.#whereTransformer.transformWhereJsonPath(expression)
    this.knexQuery.whereJsonPath(column as any, jsonPath, operator, value)
    return this
  }

  /**
   * Apply where null clause to the SQL. The column name can be a string
   * value, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   *
   * @example
   * ```ts
   * query.whereNull('deleted_at')
   * query.whereNull(db.raw(`??->>??`, ['address', 'city']))
   * ```
   */
  whereNull(...expression: WhereNullExpressionArguments): this {
    const [column] = this.#whereTransformer.transformWhereNull(expression)
    this.knexQuery.whereNull(column as any)
    return this
  }

  /**
   * Apply where NOT null clause to the SQL. The column name can be a string
   * value, {@link RefExpressionBuilder}, or the {@link RawExpressionBuilder}.
   *
   * @example
   * ```ts
   * query.whereNotNull('deleted_at')
   * query.whereNotNull(db.raw(`??->>??`, ['address', 'city']))
   * ```
   */
  whereNotNull(...expression: WhereNullExpressionArguments): this {
    const [column] = this.#whereTransformer.transformWhereNull(expression)
    this.knexQuery.whereNotNull(column as any)
    return this
  }

  /**
   * Apply where exists clause to the SQL query. The subquery can be specified
   * as a {@link SelectExpressionBuilder}, {@link RawExpressionBuilder}, or
   * a callback that receives the {@link SelectExpressionBuilder}
   *
   * @example
   * ```ts
   * query.whereExists((q) => {
   *   q.from('profiles').whereColumn('profiles.user_id', 'users.id')
   * })
   * ```
   */
  whereExists(...expression: WhereExistsExpressionArguments): this {
    const knexExpression = this.#whereTransformer.transformWhereExists(expression)
    this.knexQuery.whereExists(knexExpression as any)
    return this
  }

  /**
   * Apply where not exists clause to the SQL query. The subquery can be specified
   * as a {@link SelectExpressionBuilder}, {@link RawExpressionBuilder}, or
   * a callback that receives the {@link SelectExpressionBuilder}
   *
   * @example
   * ```ts
   * query.whereNotExists((q) => {
   *   q.from('profiles').whereColumn('profiles.user_id', 'users.id')
   * })
   * ```
   */
  whereNotExists(...expression: WhereExistsExpressionArguments): this {
    const knexExpression = this.#whereTransformer.transformWhereExists(expression)
    this.knexQuery.whereNotExists(knexExpression as any)
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
   * query.whereBetween('age', [18, 60])
   *
   * // Get all sales made during promotion
   * query.whereBetween('created_at', [
   *   (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
   *   (q) => q.from('promotions').select('ended_at').where('promotion_id', 1)
   * ])
   * ```
   */
  whereBetween(...expression: WhereBetweenExpressionArguments): this {
    const [column, values] = this.#whereTransformer.transformWhereBetween(expression)
    this.knexQuery.whereBetween(column as any, values)
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
   * query.whereNotBetween('age', [0, 10])
   *
   * // Get all sales exlcuding promotion days
   * query.whereNotBetween('created_at', [
   *   (q) => q.from('promotions').select('started_at').where('promotion_id', 1),
   *   (q) => q.from('promotions').select('ended_at').where('promotion_id', 1)
   * ])
   * ```
   */
  whereNotBetween(...expression: WhereBetweenExpressionArguments): this {
    const [column, values] = this.#whereTransformer.transformWhereBetween(expression)
    this.knexQuery.whereNotBetween(column as any, values)
    return this
  }

  /**
   * Specify a where clause as a raw SQL query.
   *
   * @example
   * ```ts
   * query.whereRaw(`??->>'city' = ?`, ['address', 'Gurgaon'])
   * ```
   */
  whereRaw(sql: string, bindings?: RawQueryBindings): this {
    this.knexQuery.whereRaw(sql, bindings)
    return this
  }

  /**
   * Define a where group that will apply the `OR` operator to all
   * the where clauses defined within the callback.
   *
   * @example
   * ```ts
   * query.or((exp) => {
   *   exp.where('username', 'virk').where('username', 'romain')
   * })
   * // SELECT * users WHERE (username = 'virk' or username = 'romain')
   * ```
   */
  or(callback: (expressionBuilder: WhereExpressionBuilder) => void): this {
    this.knexQuery.where((subQuery) => {
      const expressionBuilder = new WhereExpressionBuilder(this, this.knex, subQuery, 'or')
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
      const expressionBuilder = new WhereExpressionBuilder(this, this.knex, subQuery, 'and')
      callback(expressionBuilder)
    })
    return this
  }

  /**
   * Joins another table to the query using an inner join.
   *
   * @example
   * ```ts
   * query
   *   .from('users')
   *   .join('profiles', 'profiles.user_id', 'users.id')
   *
   * // Specify one or multiple ON conditions
   * query
   *  .from('users')
   *  .join('profiles', (joinExp) => {
   *    joinExp.on('profiles.user_id', 'users.id')
   *  })
   * ```
   */
  join(...expression: JoinExpressionArguments): this {
    return this.applyJoin(expression, 'join')
  }

  /**
   * Joins another table to the query using an inner join.
   *
   * @example
   * ```ts
   * query
   *   .from('users')
   *   .innerJoin('profiles', 'profiles.user_id', 'users.id')
   *
   * // Specify one or multiple ON conditions
   * query
   *  .from('users')
   *  .innerJoin('profiles', (joinExp) => {
   *    joinExp.on('profiles.user_id', 'users.id')
   *  })
   * ```
   */
  innerJoin(...expression: JoinExpressionArguments): this {
    return this.applyJoin(expression, 'innerJoin')
  }

  /**
   * Joins another table to the query using a LEFT join.
   *
   * @example
   * ```ts
   * query
   *   .from('users')
   *   .leftJoin('profiles', 'profiles.user_id', 'users.id')
   *
   * // Specify one or multiple ON conditions
   * query
   *  .from('users')
   *  .leftJoin('profiles', (joinExp) => {
   *    joinExp.on('profiles.user_id', 'users.id')
   *  })
   * ```
   */
  leftJoin(...expression: JoinExpressionArguments): this {
    return this.applyJoin(expression, 'leftJoin')
  }

  /**
   * Joins another table to the query using a LEFT OUTER join.
   *
   * @example
   * ```ts
   * query
   *   .from('users')
   *   .leftOuterJoin('profiles', 'profiles.user_id', 'users.id')
   *
   * // Specify one or multiple ON conditions
   * query
   *  .from('users')
   *  .leftOuterJoin('profiles', (joinExp) => {
   *    joinExp.on('profiles.user_id', 'users.id')
   *  })
   * ```
   */
  leftOuterJoin(...expression: JoinExpressionArguments): this {
    return this.applyJoin(expression, 'leftOuterJoin')
  }

  /**
   * Joins another table to the query using a RIGHT join.
   *
   * @example
   * ```ts
   * query
   *   .from('users')
   *   .rightJoin('profiles', 'profiles.user_id', 'users.id')
   *
   * // Specify one or multiple ON conditions
   * query
   *  .from('users')
   *  .rightJoin('profiles', (joinExp) => {
   *    joinExp.on('profiles.user_id', 'users.id')
   *  })
   * ```
   */
  rightJoin(...expression: JoinExpressionArguments): this {
    return this.applyJoin(expression, 'rightJoin')
  }

  /**
   * Joins another table to the query using a RIGHT OUTER join.
   *
   * @example
   * ```ts
   * query
   *   .from('users')
   *   .rightOuterJoin('profiles', 'profiles.user_id', 'users.id')
   *
   * // Specify one or multiple ON conditions
   * query
   *  .from('users')
   *  .rightOuterJoin('profiles', (joinExp) => {
   *    joinExp.on('profiles.user_id', 'users.id')
   *  })
   * ```
   */
  rightOuterJoin(...expression: JoinExpressionArguments): this {
    return this.applyJoin(expression, 'rightOuterJoin')
  }

  /**
   * Joins another table to the query using a FULL OUTER join.
   *
   * @example
   * ```ts
   * query
   *   .from('users')
   *   .fullOuterJoin('profiles', 'profiles.user_id', 'users.id')
   *
   * // Specify one or multiple ON conditions
   * query
   *  .from('users')
   *  .fullOuterJoin('profiles', (joinExp) => {
   *    joinExp.on('profiles.user_id', 'users.id')
   *  })
   * ```
   */
  fullOuterJoin(...expression: JoinExpressionArguments): this {
    return this.applyJoin(expression, 'fullOuterJoin')
  }

  /**
   * Joins another table to the query using a CROSS join.
   *
   * @example
   * ```ts
   * query
   *   .from('users')
   *   .crossJoin('profiles', 'profiles.user_id', 'users.id')
   *
   * // Specify one or multiple ON conditions
   * query
   *  .from('users')
   *  .crossJoin('profiles', (joinExp) => {
   *    joinExp.on('profiles.user_id', 'users.id')
   *  })
   * ```
   */
  crossJoin(...expression: JoinExpressionArguments): this {
    return this.applyJoin(expression, 'crossJoin')
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
