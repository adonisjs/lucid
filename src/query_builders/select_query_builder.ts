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

export class SelectQueryBuilder extends SelectExpressionBuilder {
  constructor(client: DatabaseClientContract) {
    super(client)
  }

  /**
   * Executes the select query using the database client
   */
  async exec<T>(): Promise<T[]> {
    const result = await this.knexQuery
    return result
  }
}
