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
import { uniq } from 'lodash'
import { Exception } from '@poppinss/utils'
import { HasOneQueryBuilderContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

import { HasOne } from './index'
import { BaseRelationQueryBuilder } from '../Base/QueryBuilder'

/**
 * Exposes the API for interacting with has many relationship
 */
export class HasOneQueryBuilder extends BaseRelationQueryBuilder implements HasOneQueryBuilderContract<any> {
  constructor (
    builder: knex.QueryBuilder,
    private _relation: HasOne,
    client: QueryClientContract,
    private _parent: ModelContract | ModelContract[],
  ) {
    super(builder, _relation, client, (userFn) => {
      return (builder) => {
        userFn(new HasOneQueryBuilder(builder, this._relation, this.client, _parent))
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
      const values = uniq(this._parent.map((parentInstance) => {
        return this.$getRelatedValue(parentInstance, this._relation.localKey)
      }))
      return this.whereIn(this._relation.foreignAdapterKey, values)
    }

    /**
     * Constraint for one parent
     */
    const value = this.$getRelatedValue(this._parent, this._relation.localKey)
    return this.where(this._relation.foreignAdapterKey, value).limit(1)
  }

  /**
   * Save related instance. Internally a transaction will be created
   * when parent model is not persisted. Set `wrapInTransaction=false`
   * as 2nd argument to turn it off
   */
  public async save (related: ModelContract, wrapInTransaction: boolean = true): Promise<void> {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot save with multiple parents')
      return
    }

    /**
     * Wrap in transaction when parent has not been persisted
     * to ensure consistency
     */
    let trx: TransactionClientContract | undefined
    if (!this._parent.$persisted && wrapInTransaction) {
      trx = await this.client.transaction()
    }

    const callback = (parent, related) => {
      related[this._relation.foreignKey] = this.$getRelatedValue(parent, this._relation.localKey)
    }

    if (trx) {
      return this.$persistInTrx(this._parent, related, trx, callback)
    } else {
      return this.$persist(this._parent, related, callback)
    }
  }

  /**
   * Save many is not allowed by HasOne
   */
  public async saveMany () {
    throw new Exception(`Cannot save many of ${this._relation.model.name}.${this._relation.relationName}. Use save instead.`)
  }
}
