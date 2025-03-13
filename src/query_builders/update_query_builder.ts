/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { DatabaseClientContract } from '../types/query.js'
import { SelectExpressionBuilder } from '../expression_builders/select_expression_builder.js'
import { SharedExpressionBuilder } from '../expression_builders/shared_expression_builder.js'

export class UpdateQueryBuilder extends SharedExpressionBuilder {
  #context: Record<string, any> = {}
  readonly queryType = 'write'

  /**
   * Flag to know if debugging it enabled or not
   */
  debugging: boolean = false

  constructor(protected client: DatabaseClientContract) {
    super(client.getWriteClient())
  }

  /**
   * Returns the query context
   */
  getContext(): Record<string, any> {
    return this.#context
  }

  /**
   * Define the context to be shared with the "db:query" event.
   *
   * This method will override existing context with provided values.
   * Use {@link UpdateQueryBuilder.withContext} to merge values
   */
  setContext(context: Record<string, any>): this {
    this.#context = context
    return this
  }

  /**
   * Define the context to be shared with the "db:query" event.
   *
   * The provided values will be shallow merged with the existing
   * values. Use {@link UpdateQueryBuilder.setContext} to remove existing context with
   * new values.
   */
  withContext(context: Record<string, any>): this {
    Object.assign(this.#context, context)
    return this
  }

  /**
   * Returns an instance of the {@link SelectExpressionBuilder}
   */
  createSelectSubQuery() {
    return new SelectExpressionBuilder(this.client)
  }

  /**
   * Enable/disable query debugging for the current query builder.
   * Debugging will emit the "db:query" event
   */
  debug(toggle: boolean = true) {
    this.debugging = toggle
    return this
  }

  /**
   * Define the table to update
   */
  table(table: string): this {
    this.knexQuery.table(table)
    return this
  }

  /**
   * Executes the select query using the database client
   */
  exec<T = any>(): Promise<T> {
    return this.client.exec<T>(this)
  }
}
