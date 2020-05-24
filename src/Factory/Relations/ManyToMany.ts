/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { ManyToManyRelationContract } from '@ioc:Adonis/Lucid/Relations'
import {
  FactoryStateContract,
  FactoryModelContract,
  FactoryBuilderContract,
} from '@ioc:Adonis/Lucid/Factory'

export class ManyToMany {
  constructor (private relation: ManyToManyRelationContract<LucidModel, LucidModel>) {
    this.relation.boot()
  }

  public async make (
    parent: LucidRow,
    state: FactoryStateContract,
    factory: FactoryBuilderContract<any>,
    count?: number,
  ) {
    const instances = await factory.makeMany(count || 1, state)
    parent.$setRelated(this.relation.relationName, instances)
  }

  public async create (
    parent: LucidRow,
    state: FactoryStateContract,
    factory: FactoryBuilderContract<FactoryModelContract<LucidModel, any>>,
    count?: number,
  ) {
    const customAttributes = {}
    const pivotAttributes: any = {}

    const instances = await factory.createMany(count || 1, state, (related) => {
      related.merge(customAttributes)
    })

    const [pivotKey, pivotValue] = this.relation.getPivotPair(parent)

    instances.forEach((related) => {
      const [pivotRelatedKey, pivotRelatedValue] = this.relation.getPivotRelatedPair(related)
      related.$extras[pivotKey] = pivotValue
      related.$extras[pivotRelatedKey] = pivotRelatedValue
      pivotAttributes[pivotRelatedKey] = pivotRelatedValue
    })

    await this.relation.client(parent, state.$trx!).attach(pivotAttributes)
    parent.$setRelated(this.relation.relationName, instances)
  }
}
