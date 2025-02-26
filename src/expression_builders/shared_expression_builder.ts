/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'

/**
 * The SharedExpressionBuilder class encapsulates the API methods shared between
 * the select and the update queries for the sake of not duplicating them.
 */
export abstract class SharedExpressionBuilder {
  /**
   * Function to transform keys as they are used by different
   * query methods like "where", "select", "orderBy" and so
   * on.
   */
  protected transformKey(key: string): string {
    return key
  }

  constructor(public knexQuery: Knex.QueryBuilder) {}

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
