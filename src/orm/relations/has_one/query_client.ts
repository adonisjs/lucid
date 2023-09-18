/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from '../../../../adonis-typings/database.js'
import { OneOrMany } from '../../../../adonis-typings/querybuilder.js'
import {
  ModelObject,
  LucidModel,
  LucidRow,
  ModelAssignOptions,
} from '../../../../adonis-typings/model.js'
import { HasOneClientContract } from '../../../../adonis-typings/relations.js'

import { HasOne } from './index.js'
import { managedTransaction } from '../../../utils/index.js'
import { HasOneQueryBuilder } from './query_builder.js'
import { HasOneSubQueryBuilder } from './sub_query_builder.js'

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
  static query(client: QueryClientContract, relation: HasOne, rows: OneOrMany<LucidRow>) {
    const query = new HasOneQueryBuilder(client.knexQuery(), client, rows, relation)

    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Generate a related eager query builder
   */
  static eagerQuery(client: QueryClientContract, relation: HasOne, rows: OneOrMany<LucidRow>) {
    const query = new HasOneQueryBuilder(client.knexQuery(), client, rows, relation)

    query.isRelatedPreloadQuery = true
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns an instance of the sub query builder
   */
  static subQuery(client: QueryClientContract, relation: HasOne) {
    const query = new HasOneSubQueryBuilder(client.knexQuery(), client, relation)

    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns instance of query builder
   */
  query(): any {
    return HasOneQueryClient.query(this.client, this.relation, this.parent)
  }

  /**
   * Save related model instance
   */
  async save(related: LucidRow) {
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
  async create(values: ModelObject, options?: ModelAssignOptions): Promise<LucidRow> {
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
  async firstOrCreate(
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
  async updateOrCreate(
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
