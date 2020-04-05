/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { HasManyThroughClientContract } from '@ioc:Adonis/Lucid/Relations'

import { HasManyThrough } from './index'
import { HasManyThroughQueryBuilder } from './QueryBuilder'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasManyThroughClient implements HasManyThroughClientContract<HasManyThrough, LucidModel> {
  constructor (
    public relation: HasManyThrough,
    private parent: LucidRow,
    private client: QueryClientContract,
  ) {
  }

  /**
   * Returns an instance of has many through query builder
   */
  public query (): any {
    return new HasManyThroughQueryBuilder(
      this.client.knexQuery(),
      this.client,
      this.parent,
      this.relation,
    )
  }
}
