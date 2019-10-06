/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../../adonis-typings/index.ts" />

import knex from 'knex'
import { Exception } from '@poppinss/utils'
import { HasManyThroughQueryBuilderContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

import { HasManyThrough } from './index'
import { unique } from '../../../utils'
import { BaseRelationQueryBuilder } from '../Base/QueryBuilder'

/**
 * Exposes the API for interacting with has many relationship
 */
export class HasManyThroughQueryBuilder
  extends BaseRelationQueryBuilder
  implements HasManyThroughQueryBuilderContract<any>
{
  constructor (
    builder: knex.QueryBuilder,
    private _relation: HasManyThrough,
    client: QueryClientContract,
    private _parent: ModelContract | ModelContract[],
  ) {
    super(builder, _relation, client, (userFn) => {
      return (builder) => {
        userFn(new HasManyThroughQueryBuilder(builder, this._relation, this.client, this._parent))
      }
    })
  }

  /**
   * Applies constraints for `select`, `update` and `delete` queries. The
   * inserts are not allowed directly and one must use `save` method
   * instead.
   */
  public applyConstraints () {
    /**
     * Avoid adding it for multiple times
     */
    if (this.$appliedConstraints) {
      return this
    }
    this.$appliedConstraints = true

    const throughTable = this._relation.throughModel().$table
    const relatedTable = this._relation.relatedModel().$table

    /**
     * Select * from related model and through foreign adapter key
     */
    this.select(
      `${relatedTable}.*`,
      `${throughTable}.${this._relation.foreignAdapterKey} as through_${this._relation.foreignAdapterKey}`,
    )

    /**
     * Add inner join
     */
    this.innerJoin(
      `${throughTable}`,
      `${throughTable}.${this._relation.throughLocalAdapterKey}`,
      `${relatedTable}.${this._relation.throughForeignAdapterKey}`,
    )

    /**
     * Constraint for multiple parents
     */
    if (Array.isArray(this._parent)) {
      const values = unique(this._parent.map((parentInstance) => {
        return this.$getRelatedValue(parentInstance, this._relation.localKey)
      }))
      return this.whereIn(`${throughTable}.${this._relation.foreignAdapterKey}`, values)
    }

    /**
     * Constraint for one parent
     */
    const value = this.$getRelatedValue(this._parent, this._relation.localKey)
    return this.where(`${throughTable}.${this._relation.foreignAdapterKey}`, value)
  }

  public async save () {
    throw new Exception(`Has many through doesn\'t support saving relations`)
  }

  public async saveMany () {
    throw new Exception(`Has many through doesn\'t support saving relations`)
  }
}
