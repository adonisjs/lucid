/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel, LucidRow } from '../../../adonis-typings/model.js'
import { HasManyRelationContract } from '../../../adonis-typings/relations.js'
import {
  RelationCallback,
  FactoryModelContract,
  FactoryRelationContract,
  FactoryBuilderQueryContract,
} from '../../../adonis-typings/factory.js'

import { BaseRelation } from './base.js'

/**
 * Has many to factory relation
 */
export class HasMany extends BaseRelation implements FactoryRelationContract {
  constructor(
    public relation: HasManyRelationContract<LucidModel, LucidModel>,
    factory: () => FactoryBuilderQueryContract<LucidModel, FactoryModelContract<LucidModel>>
  ) {
    super(factory)
    this.relation.boot()
  }

  /**
   * Make relationship and set it on the parent model instance
   */
  async make(parent: LucidRow, callback?: RelationCallback, count?: number) {
    const factory = this.compile(this, parent, callback)

    const customAttributes = {}
    this.relation.hydrateForPersistance(parent, customAttributes)

    const instances = await factory
      .tap((related) => {
        related.merge(customAttributes)
      })
      .makeStubbedMany(count || 1)

    parent.$setRelated(this.relation.relationName, instances)
  }

  /**
   * Persist relationship and set it on the parent model instance
   */
  async create(parent: LucidRow, callback?: RelationCallback, count?: number) {
    const factory = this.compile(this, parent, callback)

    const customAttributes = {}
    this.relation.hydrateForPersistance(parent, customAttributes)

    const instance = await factory
      .tap((related) => {
        related.merge(customAttributes)
      })
      .createMany(count || 1)

    parent.$setRelated(this.relation.relationName, instance)
  }
}
