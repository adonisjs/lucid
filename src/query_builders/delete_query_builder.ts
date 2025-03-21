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

export class DeleteQueryBuilder extends SharedExpressionBuilder {
  /**
   * Should be shared during clone
   */
  #context: Record<string, any> = {}

  /**
   * Flag to know if debugging it enabled or not
   */
  debugging: boolean = false

  /**
   * The queryType is used the query client
   */
  readonly queryType = 'write'

  /**
   * Find if the query is in a transaction
   */
  get transacting() {
    return this.client.isTransaction
  }

  constructor(protected client: DatabaseClientContract) {
    super(client.getWriteClient())
  }

  /**
   * Clones the current query with its query context, applied SQL
   * conditions and debugging state.
   */
  clone() {
    const clonedQuery = new DeleteQueryBuilder(this.client)
    clonedQuery.setContext({ ...this.getContext() })
    clonedQuery.knexQuery = this.knexQuery.clone()
    clonedQuery.debugging = this.debugging

    return clonedQuery
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
   * Use {@link DeleteQueryBuilder.withContext} to merge values
   */
  setContext(context: Record<string, any>): this {
    this.#context = context
    return this
  }

  /**
   * Define the context to be shared with the "db:query" event.
   *
   * The provided values will be shallow merged with the existing
   * values. Use {@link DeleteQueryBuilder.setContext} to remove existing context with
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
   * Define the table to delete from
   */
  table(table: string): this {
    this.knexQuery.table(table)
    return this
  }

  /**
   * Executes the delete query using the database client
   */
  exec<T = any>(): Promise<T> {
    return this.client.exec<T>(this)
  }
}
