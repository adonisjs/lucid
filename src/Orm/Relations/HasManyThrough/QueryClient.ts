/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract, OneOrMany } from '@ioc:Adonis/Lucid/Database'
import { LucidModel, LucidRow, HasManyThroughClientContract } from '@ioc:Adonis/Lucid/Orm'

import { HasManyThrough } from './index'
import { HasManyThroughQueryBuilder } from './QueryBuilder'
import { HasManyThroughSubQueryBuilder } from './SubQueryBuilder'

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
  public static query(
    client: QueryClientContract,
    relation: HasManyThrough,
    rows: OneOrMany<LucidRow>
  ) {
    const query = new HasManyThroughQueryBuilder(client.knexQuery(), client, rows, relation)
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Generate a related eager query builder
   */
  public static eagerQuery(
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
  public static subQuery(client: QueryClientContract, relation: HasManyThrough) {
    const query = new HasManyThroughSubQueryBuilder(client.knexQuery(), client, relation)

    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns an instance of has many through query builder
   */
  public query(): any {
    return HasManyThroughClient.query(this.client, this.relation, this.parent)
  }
}
