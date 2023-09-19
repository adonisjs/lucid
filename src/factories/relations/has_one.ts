/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel, LucidRow } from '../../types/model.js'
import { HasOneRelationContract } from '../../types/relations.js'
import {
  RelationCallback,
  FactoryModelContract,
  FactoryRelationContract,
  FactoryBuilderQueryContract,
} from '../../types/factory.js'

import { BaseRelation } from './base.js'

/**
 * Has one to factory relation
 */
export class HasOne extends BaseRelation implements FactoryRelationContract {
  constructor(
    public relation: HasOneRelationContract<LucidModel, LucidModel>,
    factory: () => FactoryBuilderQueryContract<LucidModel, FactoryModelContract<LucidModel>>
  ) {
    super(factory)
    this.relation.boot()
  }

  /**
   * Make relationship and set it on the parent model instance
   */
  async make(parent: LucidRow, callback?: RelationCallback) {
    const factory = this.compile(this, parent, callback)
    const customAttributes = {}
    this.relation.hydrateForPersistance(parent, customAttributes)

    const instance = await factory.tap((related) => related.merge(customAttributes)).makeStubbed()
    parent.$setRelated(this.relation.relationName, instance)
  }

  /**
   * Persist relationship and set it on the parent model instance
   */
  async create(parent: LucidRow, callback?: RelationCallback) {
    const factory = this.compile(this, parent, callback)

    const customAttributes = {}
    this.relation.hydrateForPersistance(parent, customAttributes)

    const instance = await factory.tap((related) => related.merge(customAttributes)).create()
    parent.$setRelated(this.relation.relationName, instance)
  }
}
