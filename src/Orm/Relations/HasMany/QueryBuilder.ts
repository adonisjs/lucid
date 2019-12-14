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
import { HasManyQueryBuilderContract, ModelContract, ModelObject } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

import { HasMany } from './index'
import { unique } from '../../../utils'
import { BaseRelationQueryBuilder } from '../Base/QueryBuilder'

/**
 * Exposes the API for interacting with has many relationship
 */
export class HasManyQueryBuilder
  extends BaseRelationQueryBuilder
  implements HasManyQueryBuilderContract<any> {
  constructor (
    builder: knex.QueryBuilder,
    private _relation: HasMany,
    client: QueryClientContract,
    private _parent: ModelContract | ModelContract[],
  ) {
    super(builder, _relation, client, (userFn) => {
      return (__builder) => {
        userFn(new HasManyQueryBuilder(__builder, this._relation, this.client, this._parent))
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

    /**
     * Constraint for multiple parents
     */
    if (Array.isArray(this._parent)) {
      const values = unique(this._parent.map((parentInstance) => {
        return this.$getRelatedValue(parentInstance, this._relation.localKey)
      }))
      return this.whereIn(this._relation.foreignAdapterKey, values)
    }

    /**
     * Constraint for one parent
     */
    const value = this.$getRelatedValue(this._parent, this._relation.localKey)
    return this.where(this._relation.foreignAdapterKey, value)
  }

  /**
   * Save related instance. Internally a transaction will be created
   * when parent model is not persisted. Set `wrapInTransaction=false`
   * as 2nd argument to turn it off
   */
  public async save (related: ModelContract, wrapInTransaction: boolean = true): Promise<void> {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot save with multiple parents')
    }

    /**
     * Wrap in transaction when parent has not been persisted
     * to ensure consistency
     */
    let trx: TransactionClientContract | undefined
    if (!this._parent.$persisted && wrapInTransaction) {
      trx = await this.client.transaction()
    }

    const callback = (__parent, __related) => {
      __related[this._relation.foreignKey] = this.$getRelatedValue(__parent, this._relation.localKey)
    }

    if (trx) {
      return this.$persistInTrx(this._parent, related, trx, callback)
    } else {
      return this.$persist(this._parent, related, callback)
    }
  }

  /**
   * Save many of the related models
   */
  public async saveMany (related: ModelContract[], wrapInTransaction: boolean = true): Promise<void> {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot save with multiple parents')
    }

    /**
     * Wrap in transaction when wrapInTransaction is not set to false. So that
     * we rollback to initial state, when one or more fails
     */
    let trx: TransactionClientContract | undefined
    if (wrapInTransaction) {
      trx = await this.client.transaction()
    }

    const callback = (__parent, __related) => {
      __related[this._relation.foreignKey] = this.$getRelatedValue(__parent, this._relation.localKey)
    }

    if (trx) {
      return this.$persistInTrx(this._parent, related, trx!, callback)
    } else {
      return this.$persist(this._parent, related, callback)
    }
  }

  /**
   * Create and persist related model instance
   */
  public async create (values: ModelObject, wrapInTransaction: boolean = true): Promise<any> {
    const related = new (this._relation.relatedModel())()
    related.fill(values)
    await this.save(related, wrapInTransaction)

    return related
  }

  /**
   * Create and persist related model instances
   */
  public async createMany (values: ModelObject[], wrapInTransaction: boolean = true): Promise<any> {
    const relatedModels = values.map((value) => {
      const related = new (this._relation.relatedModel())()
      related.fill(value)
      return related
    })

    await this.saveMany(relatedModels, wrapInTransaction)
    return relatedModels
  }

  /**
   * Update the related model instance or create a new one
   */
  public async updateOrCreate (
    search: ModelObject,
    updatePayload: ModelObject,
    wrapInTransaction: boolean = true,
  ): Promise<any> {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot call "updateOrCreate" with multiple parents')
    }

    /**
     * Callback is invoked after the parent is persisted, so that we can
     * read the foreign key value
     */
    const callback = (parent: ModelContract) => {
      const foreignKey = this._relation.foreignKey
      const foreignKeyValue = this.$getRelatedValue(parent, this._relation.localKey, 'updateOrCreate')

      return {
        searchPayload: Object.assign({ [foreignKey]: foreignKeyValue }, search),
        updatePayload,
      }
    }

    /**
     * Wrap in transaction when parent has not been persisted
     * to ensure consistency
     */
    let trx: TransactionClientContract | undefined
    if (!this._parent.$persisted && wrapInTransaction) {
      trx = await this.client.transaction()
    }

    if (trx) {
      return this.$updateOrCreateInTrx(this._parent, callback, trx)
    }
    return this.$updateOrCreate(this._parent, callback)
  }
}
