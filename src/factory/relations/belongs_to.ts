/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel, LucidRow } from '../../../adonis-typings/model.js'
import { BelongsToRelationContract } from '../../../adonis-typings/relations.js'
import {
  RelationCallback,
  FactoryModelContract,
  FactoryRelationContract,
  FactoryBuilderQueryContract,
} from '../../../adonis-typings/factory.js'

import { BaseRelation } from './base.js'

/**
 * A belongs to factory relation
 */
export class BelongsTo extends BaseRelation implements FactoryRelationContract {
  constructor(
    public relation: BelongsToRelationContract<LucidModel, LucidModel>,
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
    const related = await factory.makeStubbed()

    this.relation.hydrateForPersistance(parent, related)
    parent.$setRelated(this.relation.relationName, related)
  }

  /**
   * Persist relationship and set it on the parent model instance
   */
  async create(parent: LucidRow, callback?: RelationCallback) {
    const factory = this.compile(this, parent, callback)
    const related = await factory.create()

    this.relation.hydrateForPersistance(parent, related)
    parent.$setRelated(this.relation.relationName, related)
  }
}
