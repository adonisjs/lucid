/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import {
  ModelContract,
  BaseRelationNode,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { HasOneOrMany } from './HasOneOrMany'

export class HasMany extends HasOneOrMany {
  /**
   * Relationship type
   */
  public type = 'hasMany' as const

  constructor (
    relationName: string,
    options: BaseRelationNode,
    model: ModelConstructorContract,
  ) {
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
  public setRelatedMany (models: ModelContract[], related: ModelContract[]) {
    models.forEach((one) => {
      const relation = related.filter((model) => model[this.foreignKey] === one[this.localKey])
      this.setRelated(one, relation)
    })
  }
}
