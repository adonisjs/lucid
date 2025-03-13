/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { CanBeExecuted, DatabaseClientContract } from '../types/query.js'
import { SelectExpressionBuilder } from '../expression_builders/select_expression_builder.js'

/**
 * SelectQueryBuilder is used for constructing queries to select data
 * from a SQL table.
 */
export class SelectQueryBuilder extends SelectExpressionBuilder implements CanBeExecuted {
  #context: Record<string, any> = {}
  readonly queryType = 'read'

  /**
   * Flag to know if debugging it enabled or not
   */
  debugging: boolean = false

  constructor(client: DatabaseClientContract) {
    super(client)
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
   * Use {@link SelectQueryBuilder.withContext} to merge values
   */
  setContext(context: Record<string, any>): this {
    this.#context = context
    return this
  }

  /**
   * Define the context to be shared with the "db:query" event.
   *
   * The provided values will be shallow merged with the existing
   * values. Use {@link SelectQueryBuilder.setContext} to remove existing context with
   * new values.
   */
  withContext(context: Record<string, any>): this {
    Object.assign(this.#context, context)
    return this
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
   * Executes the select query using the database client
   */
  exec<T>(): Promise<T[]> {
    return this.client.exec<T[]>(this)
  }
}
