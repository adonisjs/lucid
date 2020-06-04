/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { ManyToManyRelationContract } from '@ioc:Adonis/Lucid/Relations'
import { LucidModel, LucidRow, ModelObject } from '@ioc:Adonis/Lucid/Model'
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
  constructor (
    public relation: ManyToManyRelationContract<LucidModel, LucidModel>,
    factory: () => FactoryBuilderQueryContract<FactoryModelContract<LucidModel>>
  ) {
    super(factory)
    this.relation.boot()
  }

  /**
   * Make relationship and set it on the parent model instance
   */
  public async make (parent: LucidRow, callback?: RelationCallback, count?: number) {
    const factory = this.compile(callback)
    const instances = await factory.makeStubbedMany(count || 1)

    const [pivotKey, pivotValue] = this.relation.getPivotPair(parent)
    instances.forEach((related) => {
      const [pivotRelatedKey, pivotRelatedValue] = this.relation.getPivotRelatedPair(related)

      /**
       * Update model $extra properties
       */
      related.$extras[pivotKey] = pivotValue
      related.$extras[pivotRelatedKey] = pivotRelatedValue
    })

    parent.$setRelated(this.relation.relationName, instances)
  }

  /**
   * Persist relationship and set it on the parent model instance
   */
  public async create (parent: LucidRow, callback?: RelationCallback, count?: number) {
    const factory = this.compile(callback)
    const instances = await factory.createMany(count || 1)

    /**
     * Loop over instances to build pivot attributes
     */
    const pivotAttributes: ModelObject = {}
    const [pivotKey, pivotValue] = this.relation.getPivotPair(parent)
    instances.forEach((related) => {
      const [pivotRelatedKey, pivotRelatedValue] = this.relation.getPivotRelatedPair(related)

      /**
       * Update model $extra properties
       */
      related.$extras[pivotKey] = pivotValue
      related.$extras[pivotRelatedKey] = pivotRelatedValue

      // custom pivot attributes will come here
      pivotAttributes[pivotRelatedValue] = {}
    })

    /**
     * Make pivot insert query
     */
    await this.relation.client(parent, this.ctx.$trx!).attach(pivotAttributes)

    /**
     * Setup in-memory relationship
     */
    parent.$setRelated(this.relation.relationName, instances)
  }
}
