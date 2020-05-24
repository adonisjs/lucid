/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { BelongsToRelationContract } from '@ioc:Adonis/Lucid/Relations'
import {
  FactoryModelContract,
  FactoryStateContract,
  FactoryBuilderContract,
} from '@ioc:Adonis/Lucid/Factory'

export class BelongsTo {
  constructor (private relation: BelongsToRelationContract<LucidModel, LucidModel>) {
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
    const related = await factory.create(state)
    this.relation.hydrateForPersistance(parent, related)
    parent.$setRelated(this.relation.relationName, related)
  }
}
