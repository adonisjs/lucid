/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { HasOneRelationContract } from '@ioc:Adonis/Lucid/Relations'
import {
  RelationCallback,
  FactoryModelContract,
  FactoryBuilderContract,
  FactoryRelationContract,
} from '@ioc:Adonis/Lucid/Factory'

import { BaseRelation } from './Base'

/**
 * Has one to factory relation
 */
export class HasOne extends BaseRelation implements FactoryRelationContract {
  constructor (
    public relation: HasOneRelationContract<LucidModel, LucidModel>,
    factory: () => FactoryBuilderContract<FactoryModelContract<LucidModel>>
  ) {
    super(factory)
    this.relation.boot()
  }

  /**
   * Make relationship and set it on the parent model instance
   */
  public async make (parent: LucidRow, callback?: RelationCallback) {
    const factory = this.compile(callback)
    const instance = await factory.make()
    parent.$setRelated(this.relation.relationName, instance)
  }

  /**
   * Persist relationship and set it on the parent model instance
   */
  public async create (parent: LucidRow, callback?: RelationCallback) {
    const factory = this.compile(callback)

    const customAttributes = {}
    this.relation.hydrateForPersistance(parent, customAttributes)

    const instance = await factory.create((related) => related.merge(customAttributes))
    parent.$setRelated(this.relation.relationName, instance)
  }
}
