/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { QueryClientContract } from '../types/query.js'
import { SelectExpressionBuilder } from '../expression_builders/select_expression_builder.js'

export class SelectQueryBuilder extends SelectExpressionBuilder {
  constructor(client: QueryClientContract) {
    super(client)
  }

  /**
   * Creates an instance of the {@link SelectExpressionBuilder} that can be
   * used as a subquery.
   */
  createSubQuery() {
    return new SelectExpressionBuilder(this.client)
  }
}
