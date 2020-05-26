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
  FactoryModelContract,
  FactoryContextContract,
  FactoryBuilderContract,
  FactoryRelationContract,
} from '@ioc:Adonis/Lucid/Factory'

export class HasMany implements FactoryRelationContract {
  private ctx: FactoryContextContract

  constructor (
    public relation: HasManyRelationContract<LucidModel, LucidModel>,
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
    count?: number,
  ) {
    const factory = this.factory()
    if (typeof (callback) === 'function') {
      callback(factory)
    }

    const instances = await this.factory().withCtx(this.ctx).makeMany(count || 1)
    parent.$setRelated(this.relation.relationName, instances)
  }

  public async create (
    parent: LucidRow,
    callback?: (factory: FactoryBuilderContract<FactoryModelContract<LucidModel, any>>) => void,
    count?: number,
  ) {
    const factory = this.factory()
    if (typeof (callback) === 'function') {
      callback(factory)
    }

    const customAttributes = {}
    this.relation.hydrateForPersistance(parent, customAttributes)

    const instance = await factory
      .withCtx(this.ctx)
      .createMany(count || 1, (related) => related.merge(customAttributes))

    parent.$setRelated(this.relation.relationName, instance)
  }
}
