/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel } from '@ioc:Adonis/Lucid/Orm'
import {
  RelationCallback,
  FactoryModelContract,
  FactoryContextContract,
  FactoryBuilderQueryContract,
  FactoryRelationContract,
} from '@ioc:Adonis/Lucid/Factory'

/**
 * Base relation to be extended by other factory relations
 */
export abstract class BaseRelation {
  protected ctx: FactoryContextContract
  private attributes: any = {}

  constructor(
    private factory: () => FactoryBuilderQueryContract<FactoryModelContract<LucidModel>>
  ) {}

  /**
   * Instantiates the relationship factory
   */
  protected compile(relation: FactoryRelationContract, callback?: RelationCallback) {
    const builder = this.factory().query(undefined, relation)
    if (typeof callback === 'function') {
      callback(builder)
    }

    builder.useCtx(this.ctx).mergeRecursive(this.attributes)
    return builder
  }

  /**
   * Merge attributes with the relationship and its children
   */
  public merge(attributes: any) {
    this.attributes = attributes
    return this
  }

  /**
   * Use custom ctx. This must always be called by the factory, otherwise
   * `make` and `create` calls will fail.
   */
  public useCtx(ctx: FactoryContextContract): this {
    this.ctx = ctx
    return this
  }
}
