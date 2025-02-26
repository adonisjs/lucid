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

/**
 * Raw expressions can be used to write SQL fragments as values
 * when executing a query
 */
export class RawExpressionBuilder {
  #sql: string
  #bindings?: RawQueryBindings
  #wrapBefore?: string
  #wrapAfter?: string

  constructor(sql: string, bindings?: RawQueryBindings) {
    this.#sql = sql
    this.#bindings = bindings
  }

  /**
   * Wrap the raw SQL query with a prefix and suffix.
   */
  wrap(prefix: string, suffix: string): this {
    this.#wrapAfter = suffix
    this.#wrapBefore = prefix
    return this
  }

  [TO_KNEX](client: Knex): Knex.Raw<any> {
    const rawQuery = client.raw(this.#sql, this.#bindings ?? [])
    if (this.#wrapBefore && this.#wrapAfter) {
      rawQuery.wrap(this.#wrapBefore, this.#wrapAfter)
    }
    return rawQuery
  }
}
