/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  LucidRow,
  LucidModel,
  ModelQueryBuilderContract,
  LazyLoadAggregatesContract,
} from '../../../types/model.js'

/**
 * An implementation for lazy loading model relationship aggregates
 */
export class LazyLoadAggregates<Model extends LucidRow>
  implements LazyLoadAggregatesContract<Model>
{
  private query: ModelQueryBuilderContract<LucidModel, LucidRow>

  constructor(private model: Model) {
    /**
     * Model must be persisted before the lazy loading can happen
     */
    const Model = this.model.constructor as LucidModel

    /**
     * The "refresh" query has the where clause already assigned
     */
    this.query = this.model.$getQueryFor('refresh', Model.$adapter.modelClient(this.model))

    /**
     * Selecting just the primary key
     */
    this.query.select(Model.primaryKey)
  }

  /**
   * Load aggregate of relationship
   */
  loadAggregate(relationName: any, userCallback?: any) {
    this.query.withAggregate(relationName, userCallback)
    return this
  }

  /**
   * Load count of relationship
   */
  loadCount(relationName: any, userCallback?: any) {
    this.query.withCount(relationName, userCallback)
    return this
  }

  /**
   * Execute query
   */
  async exec() {
    const result = await this.query.pojo<any>().first()
    if (!result) {
      return
    }

    /**
     * Consume adapter result
     */
    this.model.$consumeAdapterResult(result)
  }

  /**
   * Implementation of `then` for the promise API
   */
  then(resolve: any, reject?: any): any {
    return this.exec().then(resolve, reject)
  }

  /**
   * Implementation of `catch` for the promise API
   */
  catch(reject: any): any {
    return this.exec().catch(reject)
  }

  /**
   * Implementation of `finally` for the promise API
   */
  finally(fullfilled: any) {
    return this.exec().finally(fullfilled)
  }

  /**
   * Required when Promises are extended
   */
  get [Symbol.toStringTag]() {
    return this.constructor.name
  }
}
