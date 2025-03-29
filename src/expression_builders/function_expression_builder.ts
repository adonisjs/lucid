/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { AGGREGATE_ARGUMENTS } from '../symbols.js'
import type {
  AggregateMethods,
  AggregateExpression,
  AggregateExpressionArguments,
} from '../types/query.js'

export class FunctionExpressionBuilder {
  /**
   * Creates an aggregate to be parsed by the select expression
   * builder
   */
  #createAggregate(method: AggregateMethods, expression: AggregateExpressionArguments) {
    const aggregate = {
      [AGGREGATE_ARGUMENTS]: {
        method: method,
        expression,
        alias: undefined as string | undefined,
      },
      as(alias: string) {
        this[AGGREGATE_ARGUMENTS].alias = alias
        return this
      },
    }
    return aggregate satisfies AggregateExpression
  }

  /**
   * Sum values of one or more columns
   */
  sum(...expression: AggregateExpressionArguments) {
    return this.#createAggregate('sum', expression)
  }

  /**
   * Sum values of one or more columns
   */
  sumDistinct(...expression: AggregateExpressionArguments) {
    return this.#createAggregate('sumDistinct', expression)
  }

  avg(...expression: AggregateExpressionArguments) {
    return this.#createAggregate('avg', expression)
  }

  avgDistinct(...expression: AggregateExpressionArguments) {
    return this.#createAggregate('avgDistinct', expression)
  }

  min(...expression: AggregateExpressionArguments) {
    return this.#createAggregate('min', expression)
  }

  max(...expression: AggregateExpressionArguments) {
    return this.#createAggregate('max', expression)
  }

  count(...expression: AggregateExpressionArguments) {
    return this.#createAggregate('count', expression)
  }

  countDistinct(...expression: AggregateExpressionArguments) {
    return this.#createAggregate('countDistinct', expression)
  }
}
