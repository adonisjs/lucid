/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { OneOrMany } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { ManyToManyClientContract } from '@ioc:Adonis/Lucid/Relations'
import { LucidModel, LucidRow, ModelObject } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

import { ManyToMany } from './index'
import { ManyToManyQueryBuilder } from './QueryBuilder'
import { getValue, managedTransaction, syncDiff } from '../../../utils'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class ManyToManyQueryClient implements ManyToManyClientContract<ManyToMany, LucidModel> {
  constructor (
    public relation: ManyToMany,
    private parent: LucidRow,
    private client: QueryClientContract,
  ) {
  }

  /**
   * Generate a related query builder
   */
  public static query (client: QueryClientContract, relation: ManyToMany, rows: OneOrMany<LucidRow>) {
    const query = new ManyToManyQueryBuilder(client.knexQuery(), client, rows, relation)

    typeof (relation.onQueryHook) === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Generate a related eager query builder
   */
  public static eagerQuery (client: QueryClientContract, relation: ManyToMany, rows: OneOrMany<LucidRow>) {
    const query = new ManyToManyQueryBuilder(client.knexQuery(), client, rows, relation)

    query.isEagerQuery = true
    typeof (relation.onQueryHook) === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Generate a related pivot query builder
   */
  public static pivotQuery (client: QueryClientContract, relation: ManyToMany, rows: OneOrMany<LucidRow>) {
    const query = new ManyToManyQueryBuilder(client.knexQuery(), client, rows, relation)

    query.isEagerQuery = false
    query.isPivotOnlyQuery = true
    typeof (relation.onQueryHook) === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns value for the foreign key
   */
  private getForeignKeyValue (parent: LucidRow, action: string) {
    return getValue(parent, this.relation.localKey, this.relation, action)
  }

  /**
   * Returns related foreign key value
   */
  private getRelatedForeignKeyValue (related: LucidRow, action: string) {
    return getValue(related, this.relation.relatedKey, this.relation, action)
  }

  /**
   * Returns query builder instance
   */
  public query () {
    return ManyToManyQueryClient.query(this.client, this.relation, this.parent)
  }

  /**
   * Returns a query builder instance for the pivot table only
   */
  public pivotQuery () {
    return ManyToManyQueryClient.pivotQuery(this.client, this.relation, this.parent)
  }

  /**
   * Save related model instance.
   */
  public async save (related: LucidRow, checkExisting: boolean = true) {
    await managedTransaction(this.parent.$trx || this.client, async (trx) => {
      /**
       * Persist parent
       */
      this.parent.$trx = trx
      await this.parent.save()

      /**
       * Persist related
       */
      related.$trx = trx
      await related.save()

      /**
       * Sync when checkExisting = true, to avoid duplicate rows. Otherwise
       * perform insert
       */
      const relatedForeignKeyValue = this.getRelatedForeignKeyValue(related, 'save')
      if (checkExisting) {
        await this.sync([relatedForeignKeyValue], false, trx)
      } else {
        await this.attach([relatedForeignKeyValue], trx)
      }
    })
  }

  /**
   * Save many of related model instances
   */
  public async saveMany (related: LucidRow[], checkExisting: boolean = true) {
    await managedTransaction(this.parent.$trx || this.client, async (trx) => {
      /**
       * Persist parent
       */
      this.parent.$trx = trx
      await this.parent.save()

      /**
       * Persist all related models
       */
      for (let one of related) {
        one.$trx = trx
        await one.save()
      }

      /**
       * Sync when checkExisting = true, to avoid duplicate rows. Otherwise
       * perform insert
       */
      const relatedForeignKeyValues = related.map((one) => this.getRelatedForeignKeyValue(one, 'saveMany'))
      if (checkExisting) {
        await this.sync(relatedForeignKeyValues, false, trx)
      } else {
        await this.attach(relatedForeignKeyValues, trx)
      }
    })
  }

  /**
   * Create and persist an instance of related model. Also makes the pivot table
   * entry to create the relationship
   */
  public async create (values: ModelObject, checkExisting?: boolean): Promise<LucidRow> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      /**
       * Create and persist related model instance
       */
      const related = await this.relation.relatedModel().create(values, { client: trx })

      /**
       * Sync or attach a new one row
       */
      const relatedForeignKeyValue = this.getRelatedForeignKeyValue(related, 'save')
      if (checkExisting) {
        await this.sync([relatedForeignKeyValue], false, trx)
      } else {
        await this.attach([relatedForeignKeyValue], trx)
      }

      return related
    })
  }

  /**
   * Create and persist multiple of instances of related model. Also makes
   * the pivot table entries to create the relationship.
   */
  public async createMany (values: ModelObject[], checkExisting?: boolean): Promise<LucidRow[]> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      /**
       * Create and persist related model instance
       */
      const related = await this.relation.relatedModel().createMany(values, { client: trx })

      /**
       * Sync or attach new rows
       */
      const relatedForeignKeyValues = related.map((one) => this.getRelatedForeignKeyValue(one, 'saveMany'))
      if (checkExisting) {
        await this.sync(relatedForeignKeyValues, false, trx)
      } else {
        await this.attach(relatedForeignKeyValues, trx)
      }

      return related
    })
  }

  /**
   * Attach one or more related models using it's foreign key value
   * by performing insert inside the pivot table.
   */
  public async attach (
    ids: (string | number)[] | { [key: string]: ModelObject },
    trx?: TransactionClientContract,
  ): Promise<void> {
    /**
     * Pivot foreign key value (On the parent model)
     */
    const foreignKeyValue = this.getForeignKeyValue(this.parent, 'attach')

    /**
     * Finding if `ids` parameter is an object or not
     */
    const hasAttributes = !Array.isArray(ids)

    /**
     * Extracting pivot related foreign keys (On the related model)
     */
    const pivotRows = (!hasAttributes ? ids as (string | number)[] : Object.keys(ids)).map((id) => {
      return Object.assign({}, hasAttributes ? ids[id] : {}, {
        [this.relation.pivotForeignKey]: foreignKeyValue,
        [this.relation.pivotRelatedForeignKey]: id,
      })
    })

    if (!pivotRows.length) {
      return
    }

    /**
     * Perform bulk insert
     */
    const query = trx ? trx.insertQuery() : this.client.insertQuery()
    await query.table(this.relation.pivotTable).multiInsert(pivotRows)
  }

  /**
   * Detach related ids from the pivot table
   */
  public async detach (ids?: (string | number)[], trx?: TransactionClientContract) {
    const query = this.pivotQuery()

    /**
     * Scope deletion to specific rows when `id` is defined. Otherwise
     * delete all the rows
     */
    if (ids && ids.length) {
      query.whereInPivot(this.relation.pivotRelatedForeignKey, ids)
    }

    /**
     * Use transaction when defined
     */
    if (trx) {
      query.useTransaction(trx)
    }

    await query.del()
  }

  /**
   * Sync pivot rows by
   *
   * - Dropping the non-existing one's.
   * - Creating the new one's.
   * - Updating the existing one's with different attributes.
   */
  public async sync (
    ids: (string | number)[] | { [key: string]: ModelObject },
    detach: boolean = true,
    trx?: TransactionClientContract,
  ) {
    await managedTransaction(trx || this.client, async (transaction) => {
      const hasAttributes = !Array.isArray(ids)

      /**
       * An object of pivot rows from from the incoming ids or
       * an object of key-value pair.
       */
      const pivotRows = !hasAttributes ? (ids as (string | number)[]).reduce((result, id) => {
        result[id] = {}
        return result
      }, {}) : ids

      /**
       * We must scope the select query to related foreign key when ids
       * is an array and not on object. Otherwise we select *.
       */
      const query = this.pivotQuery().useTransaction(transaction)

      /**
       * We must scope the select query to related foreign key when ids
       * is an array and not on object. This will help in performance
       * when their are indexes defined on this key
       */
      if (!hasAttributes) {
        query.select(this.relation.pivotRelatedForeignKey)
      }

      /**
       * Scope query to passed ids, when don't want to detach the missing one's
       * in the current payload.
       */
      const pivotRelatedForeignKeys = Object.keys(pivotRows)
      if (!this.detach && pivotRelatedForeignKeys.length) {
        query.whereIn(this.relation.pivotRelatedForeignKey, pivotRelatedForeignKeys)
      }

      /**
       * Fetch existing pivot rows for the relationship
       */
      const existingPivotRows = await query.exec()

      /**
       * Find a diff of rows being removed, added or updated in comparison
       * to the existing pivot rows.
       */
      const { added, removed, updated } = syncDiff(existingPivotRows.reduce((result, row) => {
        result[row[this.relation.pivotRelatedForeignKey]] = row
        return result
      }, {}), pivotRows)

      /**
       * Add new rows
       */
      await this.attach(added, transaction)

      /**
       * Update
       */
      for (let id of Object.keys(updated)) {
        const attributes = updated[id]
        if (!attributes) {
          return Promise.resolve()
        }

        await this
          .pivotQuery()
          .useTransaction(transaction)
          .wherePivot(this.relation.pivotRelatedForeignKey, id)
          .update(attributes)
      }

      /**
       * Return early when detach is disabled.
       */
      if (!detach) {
        return
      }

      /**
       * Detach the removed one's
       */
      await this.detach(Object.keys(removed), transaction)
    })
  }
}
