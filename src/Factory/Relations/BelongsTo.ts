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
  FactoryContextContract,
  FactoryBuilderContract,
  FactoryRelationContract,
} from '@ioc:Adonis/Lucid/Factory'

export class BelongsTo implements FactoryRelationContract {
  private ctx: FactoryContextContract

  constructor (
    public relation: BelongsToRelationContract<LucidModel, LucidModel>,
    private factory: () => FactoryBuilderContract<FactoryModelContract<LucidModel, any>>
  ) {
    this.relation.boot()
  }

  public withCtx (ctx: FactoryContextContract): this {
    this.ctx = ctx
    return this
  }

  public async make (
    parent: LucidRow,
    callback?: (factory: FactoryBuilderContract<FactoryModelContract<LucidModel, any>>) => void,
  ) {
    const factory = this.factory()
    if (typeof (callback) === 'function') {
      callback(factory)
    }

    const instance = await factory.withCtx(this.ctx).make()
    parent.$setRelated(this.relation.relationName, instance)
  }

  public async create (
    parent: LucidRow,
    callback?: (factory: FactoryBuilderContract<FactoryModelContract<LucidModel, any>>) => void,
  ) {
    const factory = this.factory()
    if (typeof (callback) === 'function') {
      callback(factory)
    }

    const related = await factory.withCtx(this.ctx).create()
    this.relation.hydrateForPersistance(parent, related)
    parent.$setRelated(this.relation.relationName, related)
  }
}
