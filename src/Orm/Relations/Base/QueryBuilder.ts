/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/
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

import {
  ModelObject,
  ModelContract,
  RelationContract,
  ModelAdapterOptions,
  BaseRelationQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Model'

import { DBQueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

import { getValue } from '../../../utils'
import { ModelQueryBuilder } from '../../QueryBuilder'

/**
 * Exposes the API for interacting with has many relationship
 */
export abstract class BaseRelationQueryBuilder
  extends ModelQueryBuilder
  implements BaseRelationQueryBuilderContract<any> {
  protected $appliedConstraints: boolean = false

  constructor (
    builder: knex.QueryBuilder,
    private _baseRelation: RelationContract,
    client: QueryClientContract,
    queryCallback: DBQueryCallback,
  ) {
    super(builder, _baseRelation.relatedModel(), client, queryCallback)
  }

  /**
   * Applies constraints for `select`, `update` and `delete` queries. The
   * inserts are not allowed directly and one must use `save` method
   * instead.
   */
  public abstract applyConstraints (): this

  /**
   * Adds neccessary where clause to the query to perform the select
   */
  public async beforeExecute () {
    this.applyConstraints()
  }

  /**
   * Get query sql
   */
  public toSQL () {
    this.applyConstraints()
    return super['toSQL']()
  }

  /**
   * Read value for a key on a model instance, in reference to the
   * relationship operations
   */
  protected $getRelatedValue (model: ModelContract, key: string, action = this.$queryAction()) {
    return getValue(model, key, this._baseRelation, action)
  }

  /**
   * Persists related model instance by setting the FK
   */
  protected async $persist<T extends ModelContract, V extends ModelContract> (
    parent: T,
    related: V | V[],
    cb: (parent: T, related: V) => void,
  ) {
    await parent.save()

    related = Array.isArray(related) ? related : [related]
    await Promise.all(related.map((relation) => {
      /**
       * Copying options and trx to make sure relation is using
       * the same options from the parent model
       */
      relation.$trx = parent.$trx
      relation.$options = parent.$options
      cb(parent, relation)

      return relation.save()
    }))
  }

  /**
   * Persists related model instance inside a transaction. Transaction is
   * created only when parent model is not persisted and user has not
   * disabled transactions as well.
   */
  protected async $persistInTrx<T extends ModelContract, V extends ModelContract> (
    parent: T,
    related: V | V[],
    trx: TransactionClientContract,
    cb: (parent: T, related: V) => void,
  ) {
    try {
      parent.$trx = trx
      await this.$persist(parent, related, cb)
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Update relationship or create a new one.
   */
  protected async $updateOrCreate<T extends ModelContract> (
    parent: T,
    cb: (parent: T) => { searchPayload: ModelObject, updatePayload: ModelObject },
  ) {
    await parent.save()
    const { searchPayload, updatePayload } = cb(parent)

    /**
     * Passing down options of the parent model to the
     * related model
     */
    const options: ModelAdapterOptions = parent.$options || {}
    if (parent.$trx) {
      options.client = parent.$trx
    }

    return this._baseRelation
      .relatedModel()
      .updateOrCreate(searchPayload, updatePayload, options)
  }

  /**
   * Update relationship inside a managed transaction
   */
  protected async $updateOrCreateInTrx<T extends ModelContract> (
    parent: T,
    cb: (parent: T) => { searchPayload: ModelObject, updatePayload: ModelObject },
    trx: TransactionClientContract,
  ) {
    try {
      parent.$trx = trx
      const related = await this.$updateOrCreate(parent, cb)
      await trx.commit()
      return related
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Returns the query action
   */
  protected $queryAction (): string {
    let action = this.$knexBuilder['_method']
    if (action === 'select') {
      action = 'preload'
    } else if (action === 'del') {
      action = 'delete'
    }

    return action
  }

  public abstract async save (
    model: ModelContract,
    wrapInTransaction?: boolean,
  ): Promise<void>

  public abstract async saveMany (
    model: ModelContract[],
    wrapInTransaction?: boolean,
  ): Promise<void>

  public abstract async create (
    model: ModelObject,
    wrapInTransaction?: boolean,
  ): Promise<ModelContract>

  public abstract async createMany (
    model: ModelObject[],
    wrapInTransaction?: boolean,
  ): Promise<ModelContract[]>

  public abstract async updateOrCreate (
    search: ModelObject,
    updatePayload: ModelObject,
    wrapInTransaction?: boolean,
  ): Promise<ModelContract>
}
