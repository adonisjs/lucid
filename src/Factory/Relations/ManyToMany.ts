/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  ManyToManyRelationContract,
  LucidModel,
  LucidRow,
  ModelObject,
} from '@ioc:Adonis/Lucid/Orm'
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
  private attributesForPivotTable: ModelObject | ModelObject[] = {}

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
    const builder = this.compile(this, callback)
    const instances = await builder.makeStubbedMany(count || 1)
    parent.$setRelated(this.relation.relationName, instances)
  }

  /**
   * Define pivot attributes
   */
  public pivotAttributes(attributes: ModelObject | ModelObject[]) {
    this.attributesForPivotTable = attributes
    return this
  }

  /**
   * Persist relationship and set it on the parent model instance
   */
  public async create(parent: LucidRow, callback?: RelationCallback, count?: number) {
    const builder = this.compile(this, callback)
    const instances = await builder.createMany(count || 1)

    /**
     * Create object for the pivot table. We merge user defined pivot attributes with
     * the required foreign keys
     */
    const relatedForeignKeyValues = instances.reduce<Record<string, ModelObject>>(
      (result, one, index) => {
        const [, relatedForeignKeyValue] = this.relation.getPivotRelatedPair(one)
        result[relatedForeignKeyValue] = Array.isArray(this.attributesForPivotTable)
          ? this.attributesForPivotTable[index] || {}
          : this.attributesForPivotTable || {}

        return result
      },
      {}
    )

    /**
     * Make pivot insert query
     */
    await this.relation.client(parent, this.ctx.$trx!).attach(relatedForeignKeyValues)

    /**
     * Setup in-memory relationship
     */
    parent.$setRelated(this.relation.relationName, instances)
  }
}
