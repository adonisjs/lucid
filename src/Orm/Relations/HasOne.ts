/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelContract, BaseRelationNode, ModelConstructorContract } from '@ioc:Adonis/Lucid/Model'

import { HasOneOrMany } from './HasOneOrMany'

/**
 * Exposes the API to construct correct queries and set related
 * models for has one relationship
 */
export class HasOne extends HasOneOrMany {
  /**
   * Relationship type
   */
  public type = 'hasOne' as const

  constructor (relationName: string, options: BaseRelationNode, model: ModelConstructorContract) {
    super(relationName, options, model)
  }

  /**
   * Returns query for the relationship with applied constraints
   */
  public getQuery (parent: ModelContract, client: QueryClientContract) {
    const value = parent[this.localKey]

    return this.relatedModel()
      .query({ client })
      .where(this.foreignAdapterKey, this.$ensureValue(value))
      .limit(1)
  }

  /**
   * Set many related instances
   */
  public setRelatedMany (parents: ModelContract[], related: ModelContract[]) {
    /**
     * Instead of looping over the model instances, we loop over the related model instances, since
     * it can improve performance in some case. For example:
     *
     * - There are 10 parentInstances and we all of them to have one related instance, in
     *   this case we run 10 iterations.
     * - There are 10 parentInstances and 8 of them have related instance, in this case we run 8
     *   iterations vs 10.
     */
    related.forEach((relation) => {
      const parent = parents.find((model) => model[this.localKey] === relation[this.foreignKey])
      if (parent) {
        this.setRelated(parent, relation)
      }
    })
  }
}
