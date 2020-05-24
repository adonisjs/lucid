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
  FactoryBuilderContract,
  FactoryModelContract,
  FactoryStateContract,
} from '@ioc:Adonis/Lucid/Factory'

export class HasMany {
  constructor (private relation: HasManyRelationContract<LucidModel, LucidModel>) {
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
    this.relation.hydrateForPersistance(parent, customAttributes)
    const instance = await factory.createMany(count || 1, state, (related) => related.merge(customAttributes))
    parent.$setRelated(this.relation.relationName, instance)
  }
}
