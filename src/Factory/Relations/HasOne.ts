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
  FactoryStateContract,
  FactoryModelContract,
  FactoryBuilderContract,
} from '@ioc:Adonis/Lucid/Factory'

export class HasOne {
  constructor (private relation: HasOneRelationContract<LucidModel, LucidModel>) {
    this.relation.boot()
  }

  public async make (
    parent: LucidRow,
    state: FactoryStateContract,
    factory: FactoryBuilderContract<any>,
  ) {
    const instance = await factory.make(state)
    parent.$setRelated(this.relation.relationName, instance)
  }

  public async create (
    parent: LucidRow,
    state: FactoryStateContract,
    factory: FactoryBuilderContract<FactoryModelContract<LucidModel, any>>,
  ) {
    const customAttributes = {}
    this.relation.hydrateForPersistance(parent, customAttributes)
    const instance = await factory.create(state, (related) => related.merge(customAttributes))
    parent.$setRelated(this.relation.relationName, instance)
  }
}
