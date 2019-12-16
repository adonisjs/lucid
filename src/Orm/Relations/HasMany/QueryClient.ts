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

import { HasMany } from './index'
import { HasManyQueryBuilder } from './QueryBuilder'

export class HasManyQueryClient implements RelationBaseQueryClientContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    private models: ModelContract | ModelContract[],
    private client: QueryClientContract,
    private relation: HasMany,
  ) {
  }

  public query (): any {
    return new HasManyQueryBuilder(this.client.knexQuery(), this.models, this.client, this.relation)
  }

  public eagerQuery (): any {
    return this.query()
  }
}
