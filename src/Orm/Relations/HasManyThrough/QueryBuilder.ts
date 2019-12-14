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
  implements HasManyThroughQueryBuilderContract<any> {
  constructor (
    builder: knex.QueryBuilder,
    private _relation: HasManyThrough,
    client: QueryClientContract,
    private _parent: ModelContract | ModelContract[],
  ) {
    super(builder, _relation, client, (userFn) => {
      return (__builder) => {
        userFn(new HasManyThroughQueryBuilder(__builder, this._relation, this.client, this._parent))
      }
    })
  }

  /**
   * Applies constraints on the query to limit to the parent row(s).
   */
  private _applyParentConstraints (builder: HasManyThroughQueryBuilder) {
    const throughTable = this._relation.throughModel().$table

    /**
     * Constraint for multiple parents
     */
    if (Array.isArray(this._parent)) {
      const values = unique(this._parent.map((parentInstance) => {
        return this.$getRelatedValue(parentInstance, this._relation.localKey)
      }))
      return builder.whereIn(`${throughTable}.${this._relation.foreignAdapterKey}`, values)
    }

    /**
     * Constraint for one parent
     */
    const value = this.$getRelatedValue(this._parent, this._relation.localKey)
    return builder.where(`${throughTable}.${this._relation.foreignAdapterKey}`, value)
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
     * When updating or deleting the through rows, we run a whereIn
     * subquery to limit to the parent rows.
     */
    if (['delete', 'update'].includes(this.$queryAction())) {
      this.whereIn(`${relatedTable}.${this._relation.throughForeignAdapterKey}`, (builder) => {
        builder.from(throughTable)
        this._applyParentConstraints(builder)
      })
      return this
    }

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

    this._applyParentConstraints(this)
    return this
  }

  public async save (): Promise<void> {
    throw new Exception('Has many through doesn\'t support saving relations')
  }

  public async saveMany () {
    return this.save()
  }

  public async create (): Promise<any> {
    return this.save()
  }

  public async createMany (): Promise<any> {
    return this.save()
  }

  public async updateOrCreate (): Promise<any> {
    return this.save()
  }
}
