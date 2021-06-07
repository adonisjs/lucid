/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ManyToManyRelationContract, LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Orm'
import {
  RelationCallback,
  FactoryModelContract,
  FactoryRelationContract,
  FactoryBuilderQueryContract,
} from '@ioc:Adonis/Lucid/Factory'

import { BaseRelation } from './Base'

/**
 * Many to many factory relation
 */
export class ManyToMany extends BaseRelation implements FactoryRelationContract {
  constructor(
    public relation: ManyToManyRelationContract<LucidModel, LucidModel>,
    factory: () => FactoryBuilderQueryContract<FactoryModelContract<LucidModel>>
  ) {
    super(factory)
    this.relation.boot()
  }

  /**
   * Make relationship and set it on the parent model instance
   */
  public async make(parent: LucidRow, callback?: RelationCallback, count?: number) {
    const factory = this.compile(callback)
    const instances = await factory.makeStubbedMany(count || 1)
    parent.$setRelated(this.relation.relationName, instances)
  }

  /**
   * Persist relationship and set it on the parent model instance
   */
  public async create(parent: LucidRow, callback?: RelationCallback, count?: number) {
    const factory = this.compile(callback)
    const instances = await factory.createMany(count || 1)

    /**
     * Make pivot insert query
     */
    await this.relation.client(parent, this.ctx.$trx!).saveMany(instances)

    /**
     * Setup in-memory relationship
     */
    parent.$setRelated(this.relation.relationName, instances)
  }
}
