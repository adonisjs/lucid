/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract, OneOrMany } from '@ioc:Adonis/Lucid/Database'
import {
  ModelObject,
  LucidModel,
  LucidRow,
  HasOneClientContract,
  ModelAssignOptions,
} from '@ioc:Adonis/Lucid/Orm'

import { HasOne } from './index'
import { managedTransaction } from '../../../utils'
import { HasOneQueryBuilder } from './QueryBuilder'
import { HasOneSubQueryBuilder } from './SubQueryBuilder'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasOneQueryClient implements HasOneClientContract<HasOne, LucidModel> {
  constructor(
    public relation: HasOne,
    private parent: LucidRow,
    private client: QueryClientContract
  ) {}

  /**
   * Generate a related query builder
   */
  public static query(client: QueryClientContract, relation: HasOne, rows: OneOrMany<LucidRow>) {
    const query = new HasOneQueryBuilder(client.knexQuery(), client, rows, relation)

    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Generate a related eager query builder
   */
  public static eagerQuery(
    client: QueryClientContract,
    relation: HasOne,
    rows: OneOrMany<LucidRow>
  ) {
    const query = new HasOneQueryBuilder(client.knexQuery(), client, rows, relation)

    query.isRelatedPreloadQuery = true
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns an instance of the sub query builder
   */
  public static subQuery(client: QueryClientContract, relation: HasOne) {
    const query = new HasOneSubQueryBuilder(client.knexQuery(), client, relation)

    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns instance of query builder
   */
  public query(): any {
    return HasOneQueryClient.query(this.client, this.relation, this.parent)
  }

  /**
   * Save related model instance
   */
  public async save(related: LucidRow) {
    await managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      this.relation.hydrateForPersistance(this.parent, related)
      related.$trx = trx
      await related.save()
    })
  }

  /**
   * Create instance of the related model
   */
  public async create(values: ModelObject, options?: ModelAssignOptions): Promise<LucidRow> {
    const parent = this.parent

    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await parent.save()

      const valuesToPersist = Object.assign({}, values)
      this.relation.hydrateForPersistance(this.parent, valuesToPersist)
      return this.relation.relatedModel().create(valuesToPersist, { client: trx, ...options })
    })
  }

  /**
   * Get the first matching related instance or create a new one
   */
  public async firstOrCreate(
    search: ModelObject,
    savePayload?: ModelObject,
    options?: ModelAssignOptions
  ): Promise<LucidRow> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      const valuesToPersist = Object.assign({}, search)
      this.relation.hydrateForPersistance(this.parent, valuesToPersist)

      return this.relation
        .relatedModel()
        .firstOrCreate(valuesToPersist, savePayload, { client: trx, ...options })
    })
  }

  /**
   * Update the existing row or create a new one
   */
  public async updateOrCreate(
    search: ModelObject,
    updatePayload: ModelObject,
    options?: ModelAssignOptions
  ): Promise<LucidRow> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      const valuesToPersist = Object.assign({}, search)
      this.relation.hydrateForPersistance(this.parent, valuesToPersist)

      return this.relation
        .relatedModel()
        .updateOrCreate(valuesToPersist, updatePayload, { client: trx, ...options })
    })
  }
}
