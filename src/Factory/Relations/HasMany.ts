/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { HasManyRelationContract } from '@ioc:Adonis/Lucid/Relations'
import {
  RelationCallback,
  FactoryModelContract,
  FactoryBuilderContract,
  FactoryRelationContract,
} from '@ioc:Adonis/Lucid/Factory'

import { BaseRelation } from './Base'

/**
 * Has many to factory relation
 */
export class HasMany extends BaseRelation implements FactoryRelationContract {
  constructor (
    public relation: HasManyRelationContract<LucidModel, LucidModel>,
    factory: () => FactoryBuilderContract<FactoryModelContract<LucidModel>>
  ) {
    super(factory)
    this.relation.boot()
  }

  /**
   * Make relationship and set it on the parent model instance
   */
  public async make (parent: LucidRow, callback?: RelationCallback, count?: number) {
    const factory = this.compile(callback)
    const instances = await factory.makeMany(count || 1)
    parent.$setRelated(this.relation.relationName, instances)
  }

  /**
   * Persist relationship and set it on the parent model instance
   */
  public async create (parent: LucidRow, callback?: RelationCallback, count?: number) {
    const factory = this.compile(callback)

    const customAttributes = {}
    this.relation.hydrateForPersistance(parent, customAttributes)
    const instance = await factory.createMany(count || 1, (related) => related.merge(customAttributes))

    parent.$setRelated(this.relation.relationName, instance)
  }
}
