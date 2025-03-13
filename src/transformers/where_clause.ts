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
import { RawExpressionBuilder } from '../expression_builders/raw_expression_builder.js'
import { RefExpressionBuilder } from '../expression_builders/ref_expression_builder.js'
import type { WhereExpressionBuilder } from '../expression_builders/where_expression_builder.js'
import type { SharedExpressionBuilder } from '../expression_builders/shared_expression_builder.js'
import type {
  WhereOperator,
  KnexStrictValues,
  WhereExpressionArguments,
  WhereInExpressionArguments,
  WhereNullExpressionArguments,
  QueryBuilderValueExpressions,
  WhereExistsExpressionArguments,
  WhereColumnExpressionArguments,
  WhereBetweenExpressionArguments,
  WhereJSONPathExpressionArguments,
  WhereJSONObjectExpressionArguments,
} from '../types/query.js'

/**
 * Exposes the API to transform values for the various where clauses. Since,
 * where methods are implemented by multiple query builders, we encapsulate
 * its moving parts of its transformer.
 */
export class WhereClauseTransformer {
  #parent: SharedExpressionBuilder | WhereExpressionBuilder
  #knex: Knex

  constructor(parent: SharedExpressionBuilder | WhereExpressionBuilder, knex: Knex) {
    this.#parent = parent
    this.#knex = knex
  }

  /**
   * Converts the where clause column name. The value could be a string,
   * a ref or a raw query. Sub-queries are not allowed by Knex
   */
  #transformWhereColumnNameExpression<
    T extends string | string[] | RawExpressionBuilder | RefExpressionBuilder,
  >(
    column: T
  ): T extends RawExpressionBuilder
    ? Knex.Raw
    : T extends RefExpressionBuilder
      ? Knex.Ref<any, {}>
      : T {
    if (typeof column === 'string') {
      return this.#parent.transformColumnName(column) as T extends RawExpressionBuilder
        ? Knex.Raw
        : T extends RefExpressionBuilder
          ? Knex.Ref<any, {}>
          : T
    }

    if (Array.isArray(column)) {
      return column.map((c) =>
        this.#parent.transformColumnName(c)
      ) as T extends RawExpressionBuilder
        ? Knex.Raw
        : T extends RefExpressionBuilder
          ? Knex.Ref<any, {}>
          : T
    }

    /**
     * Transforming value expressions to knex compatible expressions
     */
    const transformedValue = transformValueExpressions(column, this.#parent, this.#knex)
    if (!transformedValue) {
      throw new errors.E_INVALID_SQL_EXPRESSION([column, 'where'])
    }

    return transformedValue as T extends RawExpressionBuilder
      ? Knex.Raw
      : T extends RefExpressionBuilder
        ? Knex.Ref<any, {}>
        : T
  }

  /**
   * Transforms the value for the where clause. Values other than expressions
   * builders are provided to Knex as it is.
   */
  #transformWhereValueExpression<
    T extends
      | KnexStrictValues
      | KnexStrictValues[]
      | Record<string, any>
      | QueryBuilderValueExpressions,
  >(
    column: T
  ): T extends QueryBuilderValueExpressions ? Knex.Raw | Knex.Ref<any, {}> | Knex.QueryBuilder : T {
    /**
     * Transforming value expressions to knex compatible expressions
     */
    const transformedValue = transformValueExpressions(column, this.#parent, this.#knex)
    if (transformedValue !== undefined) {
      return transformedValue as unknown as T extends QueryBuilderValueExpressions
        ? Knex.Raw | Knex.Ref<any, {}> | Knex.QueryBuilder
        : T
    }

    return column as T extends QueryBuilderValueExpressions
      ? Knex.Raw | Knex.Ref<any, {}> | Knex.QueryBuilder
      : T
  }

  /**
   * Transforms the arguments of the where method to values
   * knex can accept.
   */
  transformWhere(expression: WhereExpressionArguments) {
    /**
     * If only one argument is provided, we expect the first value
     * to be an object with where clauses.
     */
    if (expression.length === 1) {
      const column = expression[0]

      if (isPlainObject(column)) {
        const transformed = Object.keys(column).reduce<
          Record<string, KnexStrictValues | Knex.Raw | Knex.QueryBuilder>
        >((result, key) => {
          const columnName = this.#parent.transformColumnName(key)
          result[columnName] = this.#transformWhereValueExpression(column[key])
          return result
        }, {})
        return [transformed, undefined, undefined] as const
      }

      throw new errors.E_INVALID_SQL_EXPRESSION([column, 'where'])
    }

    const column = expression[0]
    let operator = expression[1]
    let value = expression[2]

    /**
     * When the value is undefined we expect the operator
     * to be the value.
     */
    if (value === undefined) {
      value = operator
      operator = '='
    }

    return [
      this.#transformWhereColumnNameExpression(column),
      operator as WhereOperator,
      this.#transformWhereValueExpression(value),
    ] as const
  }

  /**
   * Transforms the arguments of the whereColumn method to values
   * knex can accept.
   */
  transformWhereColumn(expression: WhereColumnExpressionArguments) {
    /**
     * If only one argument is provided, we expect the first value
     * to be an object with where clauses.
     */
    if (expression.length === 1) {
      const column = expression[0]

      if (isPlainObject(column)) {
        const transformed = Object.keys(column).reduce<
          Record<string, KnexStrictValues | Knex.Raw | Knex.QueryBuilder>
        >((result, key) => {
          const columnName = this.#parent.transformColumnName(key)
          const otherColumnName = this.#parent.transformColumnName(column[key])
          result[columnName] = this.#knex.ref(otherColumnName)
          return result
        }, {})
        return [transformed, undefined, undefined] as const
      }

      throw new errors.E_INVALID_SQL_EXPRESSION([column, 'whereColumn'])
    }

    const column = expression[0]
    let operator = expression[1]
    let otherColumn = expression[2]

    /**
     * When the otherColumn is undefined we expect the operator
     * to be the otherColumn.
     */
    if (otherColumn === undefined) {
      otherColumn = operator
      operator = '='
    }

    return [
      this.#transformWhereColumnNameExpression(column),
      operator as WhereOperator,
      this.#knex.ref(this.#transformWhereColumnNameExpression(otherColumn)),
    ] as const
  }

  /**
   * Transforms the arguments of the whereIn method to values
   * knex can accept.
   */
  transformWhereIn(expression: WhereInExpressionArguments) {
    return [
      this.#transformWhereColumnNameExpression(expression[0]),
      this.#transformWhereValueExpression(expression[1]),
    ] as const
  }

  /**
   * Transforms the arguments for the whereJsonObject method to values
   * knex can accept.
   */
  transformWhereJsonObject(expression: WhereJSONObjectExpressionArguments) {
    return [
      this.#transformWhereColumnNameExpression(expression[0]),
      this.#transformWhereValueExpression(expression[1]),
    ] as const
  }

  /**
   * Transforms the arguments for the whereJsonPath method to values knex
   * can accept
   */
  transformWhereJsonPath(expression: WhereJSONPathExpressionArguments) {
    return [
      this.#transformWhereColumnNameExpression(expression[0]),
      expression[1],
      expression[2],
      this.#transformWhereValueExpression(expression[3]),
    ] as const
  }

  /**
   * Transforms the arguments for the whereNull method to values knex
   * can accept
   */
  transformWhereNull(expression: WhereNullExpressionArguments) {
    return [this.#transformWhereColumnNameExpression(expression[0])] as const
  }

  /**
   * Transforms the arguments for the whereExists method to values knex
   * can accept
   */
  transformWhereExists(expression: WhereExistsExpressionArguments) {
    const transformedValue = transformValueExpressions(expression[0], this.#parent, this.#knex)
    if (!transformedValue) {
      throw new errors.E_INVALID_SQL_EXPRESSION([expression, 'whereExists'])
    }

    return transformedValue
  }

  /**
   * Transforms the arguments for the whereExists method to values knex
   * can accept
   */
  transformWhereBetween(expression: WhereBetweenExpressionArguments) {
    const column = this.#transformWhereColumnNameExpression(expression[0])
    const values = [
      this.#transformWhereValueExpression(expression[1][0]),
      this.#transformWhereValueExpression(expression[1][1]),
    ] as const

    return [column, values] as const
  }
}
