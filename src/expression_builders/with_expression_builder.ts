/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'

import { transformValueExpressions } from '../helpers.js'
import { SelectExpressionBuilder } from './select_expression_builder.js'
import type {
  DatabaseClientContract,
  FromExpressionArguments,
  WithExpressionArguments,
} from '../types/query.js'

export class WithExpressionBuilder {
  #withExpressions: WithExpressionArguments[] = []
  #method: 'with' | 'withRecursive' | 'withMaterialized' | 'withNotMaterialized'

  constructor(
    protected client: DatabaseClientContract,
    method: 'with' | 'withRecursive' | 'withMaterialized' | 'withNotMaterialized'
  ) {
    this.#method = method
  }

  protected transformWithExpressionValue(
    valueExpression: Exclude<WithExpressionArguments[2], undefined>
  ) {
    const value =
      typeof valueExpression === 'function' ? valueExpression(this.client) : valueExpression
    return transformValueExpressions(value, this, this.client.getReadClient())
  }

  protected applyWithExpression(query: Knex.QueryBuilder, expression: WithExpressionArguments) {
    if (expression.length === 2) {
      return query[this.#method](expression[0], this.transformWithExpressionValue(expression[1]))
    }
    return query[this.#method](
      expression[0],
      expression[1],
      this.transformWithExpressionValue(expression[2])
    )
  }

  /**
   * Returns an instance of the {@link SelectExpressionBuilder}
   */
  createSelectSubQuery() {
    return new SelectExpressionBuilder(this.client)
  }

  with(...expression: WithExpressionArguments): this {
    this.#withExpressions.push(expression)
    return this
  }

  selectFrom(...expression: FromExpressionArguments) {
    const query = this.client.selectFrom(...expression)
    this.#withExpressions.forEach((withExpression) =>
      this.applyWithExpression(query.knexQuery, withExpression)
    )

    return query
  }

  insertInto(table: string) {
    const query = this.client.insertInto(table)
    this.#withExpressions.forEach((expression) =>
      this.applyWithExpression(query.knexQuery, expression)
    )

    return query
  }
}
