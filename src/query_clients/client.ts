/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Connection } from '../connection.js'
import { RawExpressionBuilder } from '../expression_builders/raw_expression_builder.js'
import { RefExpressionBuilder } from '../expression_builders/ref_expression_builder.js'
import type { QueryClientContract, RawQueryBindings } from '../types/query.js'

export class QueryClient implements QueryClientContract {
  debug: boolean = false
  isTransaction: false = false

  get dialect() {
    return this.connection.dialect
  }

  get connectionName() {
    return this.connection.identifier
  }

  constructor(
    public readonly connection: Connection,
    public readonly mode: QueryClientContract['mode']
  ) {}

  ref(reference: string): RefExpressionBuilder {
    return new RefExpressionBuilder(reference)
  }

  raw(sql: string, bindings?: RawQueryBindings): RawExpressionBuilder {
    return new RawExpressionBuilder(sql, bindings)
  }
}
