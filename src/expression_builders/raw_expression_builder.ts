/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { TO_KNEX } from '../symbols.js'
import type { RawQueryBindings } from '../types/query.js'
import { RefExpressionBuilder } from './ref_expression_builder.js'

/**
 * Raw expressions can be used to write SQL fragments as values
 * when executing a query
 */
export class RawExpressionBuilder {
  #sql: string
  #bindings?: RawQueryBindings
  #wrapBefore?: string | RawExpressionBuilder | RefExpressionBuilder
  #wrapAfter?: string | RawExpressionBuilder | RefExpressionBuilder

  constructor(sql: string, bindings?: RawQueryBindings) {
    this.#sql = sql
    this.#bindings = bindings
  }

  /**
   * Transforms a query expression to a string value
   */
  #transformExpression(
    expression: string | RawExpressionBuilder | RefExpressionBuilder,
    client: Knex
  ): string {
    return expression instanceof RawExpressionBuilder
      ? expression[TO_KNEX](client).toQuery()
      : expression instanceof RefExpressionBuilder
        ? expression[TO_KNEX](client).toQuery()
        : expression
  }

  /**
   * Wrap the raw SQL query with a prefix and suffix.
   */
  wrap(
    prefix: string | RawExpressionBuilder | RefExpressionBuilder,
    suffix: string | RawExpressionBuilder | RefExpressionBuilder
  ): this {
    this.#wrapAfter = suffix
    this.#wrapBefore = prefix
    return this
  }

  /**
   * Convert raw to Knex.raw
   */
  [TO_KNEX](client: Knex): Knex.Raw<any> {
    const rawQuery = client.raw(this.#sql, this.#bindings ?? [])
    if (this.#wrapBefore && this.#wrapAfter) {
      rawQuery.wrap(
        this.#transformExpression(this.#wrapBefore, client),
        this.#transformExpression(this.#wrapAfter, client)
      )
    }
    return rawQuery
  }
}
