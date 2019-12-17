/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { RelationBaseQueryClientContract } from '@ioc:Adonis/Lucid/Relations'

import { HasManyThrough } from './index'
import { HasManyThroughQueryBuilder } from './QueryBuilder'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasManyThroughClient implements RelationBaseQueryClientContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    private parent: ModelContract | ModelContract[],
    private client: QueryClientContract,
    private relation: HasManyThrough,
  ) {
  }

  public query (): any {
    return new HasManyThroughQueryBuilder(this.client.knexQuery(), this.client, this.parent, this.relation)
  }

  public eagerQuery (): any {
    return new HasManyThroughQueryBuilder(this.client.knexQuery(), this.client, this.parent, this.relation, true)
  }
}
