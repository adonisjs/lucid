/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import * as errors from './errors.js'
import { TO_KNEX } from './symbols.js'
import type { QueryBuilderValueExpressions } from './types/query.js'
import { RefExpressionBuilder } from './expression_builders/ref_expression_builder.js'
import { RawExpressionBuilder } from './expression_builders/raw_expression_builder.js'
import type { WhereExpressionBuilder } from './expression_builders/where_expression_builder.js'
import type { SharedExpressionBuilder } from './expression_builders/shared_expression_builder.js'
import type { SelectExpressionBuilder } from './expression_builders/select_expression_builder.js'
import { InsertQueryBuilder } from './query_builders/insert_query_builder.js'

/**
 * Checks if value is an object excluding Arrays and null values
 */
export function isObject<T extends Record<string, any>>(value: unknown): value is T {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Checks if value is a plain object and not an instance of a class
 */
export function isPlainObject<T extends Record<string, any> = Record<string, any>>(
  value: unknown
): value is T {
  if (!isObject(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  )
}

/**
 * Transforms a Lucid value expression to Knex value expression.
 */
export function transformValueExpressions<
  T extends SelectExpressionBuilder | ((query: SelectExpressionBuilder) => void),
>(
  value: T,
  self: SharedExpressionBuilder | WhereExpressionBuilder | InsertQueryBuilder,
  knex: Knex
): Knex.QueryBuilder
export function transformValueExpressions<T extends RawExpressionBuilder | RefExpressionBuilder>(
  value: T,
  self: SharedExpressionBuilder | WhereExpressionBuilder | InsertQueryBuilder,
  knex: Knex
): Knex.Raw | Knex.Ref<any, {}>
export function transformValueExpressions<T extends QueryBuilderValueExpressions | any>(
  value: T,
  self: SharedExpressionBuilder | WhereExpressionBuilder | InsertQueryBuilder,
  knex: Knex
): Knex.QueryBuilder | Knex.Raw | Knex.Ref<any, {}> | undefined
export function transformValueExpressions<T>(
  value: T,
  self: SharedExpressionBuilder | WhereExpressionBuilder | InsertQueryBuilder,
  knex: Knex
): undefined
export function transformValueExpressions<T>(
  value: T,
  self: SharedExpressionBuilder | WhereExpressionBuilder | InsertQueryBuilder,
  knex: Knex
) {
  /**
   * Converts inline callback to a Knex subquery
   */
  if (typeof value === 'function') {
    const query = self.createSelectSubQuery()
    value(query)
    return query.knexQuery
  }

  /**
   * Converts raw and reference to Knex.raw or Knex.ref
   */
  if (value instanceof RawExpressionBuilder || value instanceof RefExpressionBuilder) {
    return value[TO_KNEX](knex)
  }

  /**
   * Returns "knexQuery" property from objects
   */
  if (value && typeof value === 'object' && 'knexQuery' in value) {
    if (value === (self as any)) {
      throw new errors.E_INVALID_SUBQUERY_REFERENCE()
    }
    return value.knexQuery
  }
}
