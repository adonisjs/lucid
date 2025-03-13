/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import type { InsertQueryBuilder } from '../query_builders/insert_query_builder.js'

/**
 * ConflictExpressionBuilder is used to construct the "ON CONFLICT" action
 * on an insert query.
 */
export class ConflictExpressionBuilder {
  constructor(
    protected parent: InsertQueryBuilder,
    protected knexQuery: Knex.OnConflictQueryBuilder<any, any>
  ) {}

  /**
   * Silently ignore errors occurred due to a conflict.
   *
   * - Uses INSERT IGNORE in MySQL
   * - Adds an ON CONFLICT (columns) DO NOTHING clause in PostgreSQL and
   *   SQLite
   *
   * @example
   * ```ts
   * query.onConflict().ignore()
   * ```
   */
  ignore() {
    this.knexQuery.ignore()
    return this.parent
  }

  /**
   * Perform a merge when an error occurrs due to a conflict.
   *
   * @example
   * ```ts
   * // Perform merge
   * query.onConflict().merge()
   *
   * // Perform merge with custom values
   * query.onConflict().merge({ column: 'value' })
   *
   * // Merge selected columns only
   * query.onConflict().merge(['score'])
   * ```
   */
  merge(columns: string[]): InsertQueryBuilder
  merge(data: Record<string, any>): InsertQueryBuilder
  merge(): InsertQueryBuilder
  merge(columns?: string[] | Record<string, any>): InsertQueryBuilder {
    this.knexQuery.merge(columns)
    return this.parent
  }
}
