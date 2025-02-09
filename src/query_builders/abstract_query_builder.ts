/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { SelectExpressions } from '../types.js'

export abstract class AbstractQueryBuilder {
  /**
   * Function to transform keys as they are used by different
   * query methods like "where", "select", "orderBy" and so
   * on.
   */
  protected transformKey(key: string): string {
    return key
  }

  /**
   * Builder to create a sub-query builder instance from a given knex
   * query
   */
  protected abstract createSubQueryBuilder(knexQuery: Knex.QueryBuilder): AbstractQueryBuilder

  constructor(public knexQuery: Knex.QueryBuilder) {}

  /**
   * Select one or more columns from a given table. The columns
   * can be represented as following values.
   *
   * - A string value represents the column name. "email".
   * - A string value can also represent a column name + alias. "email as e".
   * - AbstractQueryBuilder represents a subquery that must produce a single
   *   row. "SELECT (SELECT profiles.email from profiles LIMIT 1) from users";
   * - Or a callback that receives a new query.
   *
   * @example
   * ```
   * select('email')
   * select('email as e')
   * query().from('users').select(
   *   db
   *    .query()
   *    .from('profiles')
   *    .select('profiles.email')
   *    .where('users.id', '=', 'profiles.user_id')
   *    .limit(1)
   * )
   * ```
   */
  select(...columns: SelectExpressions[]) {
    const knexColumns = columns.map((column) => {
      if (typeof column === 'string') {
        return this.transformKey(column)
      }
      return column.knexQuery
    })

    this.knexQuery.select(knexColumns)
    return this
  }
}
