/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from '../../../types/database.js'
import { OneOrMany } from '../../../types/querybuilder.js'
import { LucidModel, LucidRow } from '../../../types/model.js'
import { HasManyThroughClientContract } from '../../../types/relations.js'

import { HasManyThrough } from './index.js'
import { HasManyThroughQueryBuilder } from './query_builder.js'
import { HasManyThroughSubQueryBuilder } from './sub_query_builder.js'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasManyThroughClient
  implements HasManyThroughClientContract<HasManyThrough, LucidModel>
{
  constructor(
    public relation: HasManyThrough,
    private parent: LucidRow,
    private client: QueryClientContract
  ) {}

  /**
   * Generate a related query builder
   */
  static query(client: QueryClientContract, relation: HasManyThrough, rows: OneOrMany<LucidRow>) {
    const query = new HasManyThroughQueryBuilder(client.knexQuery(), client, rows, relation)
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Generate a related eager query builder
   */
  static eagerQuery(
    client: QueryClientContract,
    relation: HasManyThrough,
    rows: OneOrMany<LucidRow>
  ) {
    const query = new HasManyThroughQueryBuilder(client.knexQuery(), client, rows, relation)

    query.isRelatedPreloadQuery = true
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns an instance of the sub query
   */
  static subQuery(client: QueryClientContract, relation: HasManyThrough) {
    const query = new HasManyThroughSubQueryBuilder(client.knexQuery(), client, relation)

    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns an instance of has many through query builder
   */
  query(): any {
    return HasManyThroughClient.query(this.client, this.relation, this.parent)
  }
}
