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
 * models for has many relationship
 */
export class HasMany extends HasOneOrMany {
  /**
   * Relationship type
   */
  public type = 'hasMany' as const

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
  }

  /**
   * Set many related instances
   */
  public setRelatedMany (parents: ModelContract[], related: ModelContract[]) {
    parents.forEach((parent) => {
      const relation = related.filter((model) => model[this.foreignKey] === parent[this.localKey])
      this.setRelated(parent, relation)
    })
  }
}
