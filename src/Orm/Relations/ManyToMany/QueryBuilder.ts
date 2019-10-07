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
import { ModelContract, ManyToManyQueryBuilderContract } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

import { ManyToMany } from './index'
import { unique, difference } from '../../../utils'
import { BaseRelationQueryBuilder } from '../Base/QueryBuilder'

/**
 * Query builder with many to many relationships
 */
export class ManyToManyQueryBuilder
  extends BaseRelationQueryBuilder
  implements ManyToManyQueryBuilderContract<any>
{
  constructor (
    builder: knex.QueryBuilder,
    private _relation: ManyToMany,
    client: QueryClientContract,
    private _parent: ModelContract | ModelContract[],
  ) {
    super(builder, _relation, client, (userFn) => {
      return (builder) => {
        userFn(new ManyToManyQueryBuilder(builder, this._relation, this.client, this._parent))
      }
    })
  }

  /**
   * Prefixes the pivot table name to the key
   */
  private _prefixPivotTable (key: string) {
    return `${this._relation['pivotTable']}.${key}`
  }

  /**
   * Add where clause with pivot table prefix
   */
  public wherePivot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.where(this._prefixPivotTable(key), operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.where(this._prefixPivotTable(key), this.$transformValue(operator))
    } else {
      this.$knexBuilder.where(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Add or where clause with pivot table prefix
   */
  public orWherePivot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.orWhere(this._prefixPivotTable(key), operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.orWhere(this._prefixPivotTable(key), this.$transformValue(operator))
    } else {
      this.$knexBuilder.orWhere(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Alias for wherePivot
   */
  public andWherePivot (key: any, operator?: any, value?: any): this {
    return this.wherePivot(key, operator, value)
  }

  /**
   * Add where not pivot
   */
  public whereNotPivot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.whereNot(this._prefixPivotTable(key), operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.whereNot(this._prefixPivotTable(key), this.$transformValue(operator))
    } else {
      this.$knexBuilder.whereNot(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Add or where not pivot
   */
  public orWhereNotPivot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.orWhereNot(this._prefixPivotTable(key), operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.orWhereNot(this._prefixPivotTable(key), this.$transformValue(operator))
    } else {
      this.$knexBuilder.orWhereNot(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Alias for `whereNotPivot`
   */
  public andWhereNotPivot (key: any, operator?: any, value?: any): this {
    return this.whereNotPivot(key, operator, value)
  }

  /**
   * Adds where in clause
   */
  public whereInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this._prefixPivotTable(one))
      : this._prefixPivotTable(key)

    this.$knexBuilder.whereIn(key, value)
    return this
  }

  /**
   * Adds or where in clause
   */
  public orWhereInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this._prefixPivotTable(one))
      : this._prefixPivotTable(key)

    this.$knexBuilder.orWhereIn(key, value)
    return this
  }

  /**
   * Alias from `whereInPivot`
   */
  public andWhereInPivot (key: any, value: any): this {
    return this.whereInPivot(key, value)
  }

  /**
   * Adds where not in clause
   */
  public whereNotInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this._prefixPivotTable(one))
      : this._prefixPivotTable(key)

    this.$knexBuilder.whereNotIn(key, value)
    return this
  }

  /**
   * Adds or where not in clause
   */
  public orWhereNotInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this._prefixPivotTable(one))
      : this._prefixPivotTable(key)

    this.$knexBuilder.orWhereNotIn(key, value)
    return this
  }

  /**
   * Alias from `whereNotInPivot`
   */
  public andWhereNotInPivot (key: any, value: any): this {
    return this.whereNotInPivot(key, value)
  }

  /**
   * Select pivot columns
   */
  public pivotColumns (columns: string[]): this {
    this.$knexBuilder.select(columns.map((column) => {
      return `${this._prefixPivotTable(column)} as pivot_${column}`
    }))
    return this
  }

  /**
   * Adds where or where clause on the query builder based upon the
   * number of parent records passed to the query builder.
   */
  private _addParentConstraint (builder: ManyToManyQueryBuilder) {
    /**
     * Constraint for multiple parents
     */
    if (Array.isArray(this._parent)) {
      const values = unique(this._parent.map((parentInstance) => {
        return this.$getRelatedValue(parentInstance, this._relation.localKey)
      }))
      builder.whereInPivot(this._relation.pivotForeignKey, values)
      return
    }

    /**
     * Constraint for one parent
     */
    const value = this.$getRelatedValue(this._parent, this._relation.localKey)
    builder.wherePivot(this._relation.pivotForeignKey, value)
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
     * We do not allow deleting/updating the related rows via `relationship.delete`.
     *
     * For example:
     * A `user` has many to many `roles`, so issuing a delete query using the
     * user instance cannot delete the `roles` from the `roles` table, but
     * instead it only deletes the `user roles` from the pivot table.
     *
     * In short user doesn't own the role directly, it owns a relationship with
     * the role and hence it can only remove the relation.
     */
    if (['delete', 'update'].includes(this.$queryAction())) {
      this.from(this._relation.pivotTable)
      this._addParentConstraint(this)
      return this
    }

    /**
     * Select * from related model
     */
    this.select(`${this._relation.relatedModel().$table}.*`)

    /**
     * Select pivot columns
     */
    this.pivotColumns(
      [
        this._relation.pivotForeignKey,
        this._relation.pivotRelatedForeignKey,
      ].concat(this._relation.extrasPivotColumns),
    )

    /**
     * Add inner join
     */
    this.innerJoin(
      this._relation.pivotTable,
      `${this._relation.relatedModel().$table}.${this._relation.relatedAdapterKey}`,
      `${this._relation.pivotTable}.${this._relation.pivotRelatedForeignKey}`,
    )

    this._addParentConstraint(this)
    return this
  }

  /**
   * Perists the model, related model along with the pivot entry
   */
  private async _persist (
    parent: ModelContract,
    related: ModelContract | ModelContract[],
    checkExisting: boolean,
  ) {
    related = Array.isArray(related) ? related : [related]

    /**
     * Persist parent and related models (if required)
     */
    await this.$persist(parent, related, () => {})

    /**
     * Pull the parent model client from the adapter, so that it used the
     * same connection options for creating the pivot entry
     */
    const client = this._relation.model.$adapter.modelClient(parent)

    /**
     * Attach the id
     */
    await this._attach(
      parent,
      client,
      related.map((relation) => this.$getRelatedValue(relation, this._relation.relatedKey)),
      checkExisting,
    )
  }

  /**
   * Perists the model, related model along with the pivot entry inside the
   * transaction.
   */
  private async _persistInTransaction (
    parent: ModelContract,
    related: ModelContract | ModelContract[],
    trx: TransactionClientContract,
    checkExisting: boolean,
  ) {
    related = Array.isArray(related) ? related : [related]

    try {
      /**
       * Setting transaction on the parent model and this will
       * be copied over related model as well inside the
       * $persist call
       */
      parent.$trx = trx
      await this.$persist(parent, related, () => {})

      /**
       * Invoking attach on the related model id and passing the transaction
       * client around, so that the pivot insert is also a part of
       * the transaction
       */
      await this._attach(
        parent,
        trx,
        related.map((relation) => this.$getRelatedValue(relation, this._relation.relatedKey)),
        checkExisting,
      )

      /**
       * Commit the transaction
       */
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Make relation entries to the pivot table. The id's must be a reference
   * to the related model primary key, and this method doesn't perform
   * any checks for same.
   */
  private async _attach (
    parent: ModelContract,
    client: QueryClientContract,
    ids: (string | number)[] | { [key: string]: any },
    checkExisting: boolean,
  ) {
    let idsList = unique(Array.isArray(ids) ? ids : Object.keys(ids))
    const hasAttributes = !Array.isArray(ids)

    /**
     * Pull existing pivot rows when `checkExisting = true` and persist only
     * the differnce
     */
    if (checkExisting) {
      const existingRows = await client
        .query()
        .from(this._relation.pivotTable)
        .select(this._relation.pivotRelatedForeignKey)
        .whereIn(this._relation.pivotRelatedForeignKey, idsList)
        .where(
          this._relation.pivotForeignKey,
          this.$getRelatedValue(parent, this._relation.localKey, 'attach'),
        )

      const existingIds = existingRows.map((row) => row[this._relation.pivotRelatedForeignKey])
      idsList = difference(idsList, existingIds)
    }

    /**
     * Ignore when there is nothing to insert
     */
    if (!idsList.length) {
      return
    }

    /**
     * Perform multiple inserts in one go
     */
    await client
      .insertQuery()
      .table(this._relation.pivotTable)
      .multiInsert(idsList.map((id) => {
        const payload = {
          [this._relation.pivotForeignKey]: this.$getRelatedValue(parent, this._relation.localKey),
          [this._relation.pivotRelatedForeignKey]: id,
        }

        return hasAttributes ? Object.assign(payload, ids[id]) : payload
      }))
  }

  /**
   * Save related model instance with entry in the pivot table
   */
  public async save (
    related: ModelContract,
    wrapInTransaction: boolean = true,
    checkExisting: boolean = true,
  ): Promise<void> {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot save with multiple parents')
      return
    }

    /**
     * Wrap in transaction when wrapInTransaction is not set to false. So that
     * we rollback to initial state, when one or more fails
     */
    let trx: TransactionClientContract | undefined
    if (wrapInTransaction) {
      trx = await this.client.transaction()
    }

    if (trx) {
      await this._persistInTransaction(this._parent, related, trx, checkExisting)
    } else {
      await this._persist(this._parent, related, checkExisting)
    }
  }

  /**
   * Save many of related model instances with entry
   * in the pivot table
   */
  public async saveMany (
    related: ModelContract[],
    wrapInTransaction: boolean = true,
    checkExisting: boolean = true,
  ) {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot save with multiple parents')
      return
    }

    /**
     * Wrap in transaction when wrapInTransaction is not set to false. So that
     * we rollback to initial state, when one or more fails
     */
    let trx: TransactionClientContract | undefined
    if (wrapInTransaction) {
      trx = await this.client.transaction()
    }

    if (trx) {
      await this._persistInTransaction(this._parent, related, trx, checkExisting)
    } else {
      await this._persist(this._parent, related, checkExisting)
    }
  }

  /**
   * Attach one of more related instances
   */
  public async attach (
    ids: (string | number)[] | { [key: string]: any },
    checkExisting: boolean = true,
  ) {
    if (Array.isArray(this._parent)) {
      throw new Error('Cannot save with multiple parents')
      return
    }

    const client = this._relation.model.$adapter.modelClient(this._parent)
    await this._attach(this._parent, client, ids, checkExisting)
  }
}
