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

import { ModelContract, BelongsToQueryBuilderContract } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

import { BelongsTo } from './index'
import { unique } from '../../../utils'
import { BaseRelationQueryBuilder } from '../Base/QueryBuilder'

/**
 * Exposes the API for interacting with belongs relationship
 */
export class BelongsToQueryBuilder
  extends BaseRelationQueryBuilder
  implements BelongsToQueryBuilderContract<any> {
  constructor (
    builder: knex.QueryBuilder,
    private _relation: BelongsTo,
    client: QueryClientContract,
    private _parent: ModelContract | ModelContract[],
  ) {
    super(builder, _relation, client, (userFn) => {
      return (__builder) => {
        userFn(new BelongsToQueryBuilder(__builder, this._relation, this.client, this._parent))
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
        return this.$getRelatedValue(parentInstance, this._relation.foreignKey)
      }))
      return this.whereIn(this._relation.localAdapterKey, values)
    }

    /**
     * Constraint for one parent
     */
    const value = this.$getRelatedValue(this._parent, this._relation.foreignKey)
    this.where(this._relation.localAdapterKey, value)

    if (!['update', 'delete'].includes(this.$queryAction())) {
      this.limit(1)
    }

    return this
  }

  /**
   * Persists related model instance by setting the FK
   */
  protected async $persist<T extends ModelContract, V extends ModelContract> (
    parent: T,
    related: V | V[],
    cb: (parent: T, related: V) => void,
  ) {
    related = related as V

    /**
     * Copying options and trx to make sure relation is using
     * the same options from the parent model
     */
    related.$trx = parent.$trx
    related.$options = parent.$options
    await related.save()

    cb(parent, related)
    return parent.save()
  }

  /**
   * Save related
   */
  public async save (related: ModelContract, wrapInTransaction: boolean = true) {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot save with multiple parents')
    }

    /**
     * Wrap in transaction when parent has not been persisted
     * to ensure consistency
     */
    let trx: TransactionClientContract | undefined
    if (!related.$persisted && wrapInTransaction) {
      trx = await this.client.transaction()
    }

    const callback = (__parent: ModelContract, __related: ModelContract) => {
      __parent[this._relation.foreignKey] = this.$getRelatedValue(__related, this._relation.localKey)
    }

    if (trx) {
      return this.$persistInTrx(this._parent, related, trx, callback)
    } else {
      return this.$persist(this._parent, related, callback)
    }
  }

  /**
   * Alias for save, since `associate` feels more natural
   */
  public async associate (related: ModelContract, wrapInTransaction: boolean = true) {
    return this.save(related, wrapInTransaction)
  }

  /**
   * Remove relation
   */
  public async dissociate () {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot save with multiple parents')
    }

    this._parent[this._relation.foreignKey] = null
    await this._parent.save()
  }

  /**
   * Save many not allowed for belongsTo
   */
  public saveMany (): Promise<void> {
    throw new Exception(`Cannot save many of ${this._relation.model.name}.${this._relation.relationName}. Use associate instead.`)
  }
}
