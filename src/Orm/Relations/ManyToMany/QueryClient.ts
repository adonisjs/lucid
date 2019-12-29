/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ManyToManyClientContract } from '@ioc:Adonis/Lucid/Relations'
import { ModelConstructorContract, ModelContract, ModelObject } from '@ioc:Adonis/Lucid/Model'

import { ManyToMany } from './index'
// import { getValue } from '../../../utils'
import { BaseQueryClient } from '../Base/QueryClient'
import { ManyToManyQueryBuilder } from './QueryBuilder'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class ManyToManyQueryClient extends BaseQueryClient implements ManyToManyClientContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    private parent: ModelContract | ModelContract[],
    protected $client: QueryClientContract,
    protected $relation: ManyToMany,
  ) {
    super($client, $relation)
  }

  /**
   * Ensures that persistance is invoked on a single parent instance
   */
  private ensureSingleParent (parent: ModelContract | ModelContract[]): asserts parent is ModelContract {
    if (Array.isArray(parent)) {
      throw new Exception('Cannot save related models with multiple parent instances')
    }
  }

  /**
   * Returns value for the foreign key
   */
  // private getForeignKeyValue (parent: ModelContract, action: string) {
  //   return getValue(parent, this.$relation.$localKey, this.$relation, action)
  // }

  public query (): any {
    return new ManyToManyQueryBuilder(this.$client.knexQuery(), this.$client, this.parent, this.$relation)
  }

  public eagerQuery (): any {
    return new ManyToManyQueryBuilder(this.$client.knexQuery(), this.$client, this.parent, this.$relation, true)
  }

  public async create (): Promise<ModelContract> {
    return {} as Promise<ModelContract>
  }

  public async createMany (): Promise<ModelContract[]> {
    return {} as Promise<ModelContract[]>
  }

  public async save (related: ModelContract) {
    this.ensureSingleParent(this.parent)
    await this.parent.save()
    await this.$persist(related)
  }

  public async saveMany () {}

  public async attach (
    _ids: (string | number)[] | { [key: string]: ModelObject },
  ): Promise<void> {
  }

  public async detach () {}

  public async sync () {}
}
