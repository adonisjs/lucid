/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { LucidModel } from '@ioc:Adonis/Lucid/Model'
import {
  RelationCallback,
  FactoryModelContract,
  FactoryContextContract,
  FactoryBuilderContract,
} from '@ioc:Adonis/Lucid/Factory'

/**
 * Base relation to be extended by other factory relations
 */
export abstract class BaseRelation {
  protected ctx: FactoryContextContract

  constructor (
    private factory: () => FactoryBuilderContract<FactoryModelContract<LucidModel>>
  ) {
  }

  /**
   * Instantiates the relationship factory
   */
  protected compile (callback?: RelationCallback) {
    const factory = this.factory()
    if (typeof (callback) === 'function') {
      callback(factory)
    }

    factory.useCtx(this.ctx)
    return factory
  }

  /**
   * Use custom ctx. This must always be called by the factory, otherwise
   * `make` and `create` calls will fail.
   */
  public useCtx (ctx: FactoryContextContract): this {
    this.ctx = ctx
    return this
  }
}
