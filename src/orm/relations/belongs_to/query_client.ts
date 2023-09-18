/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { OneOrMany } from '../../../../adonis-typings/querybuilder.js'
import { QueryClientContract } from '../../../../adonis-typings/database.js'
import { LucidModel, LucidRow } from '../../../../adonis-typings/model.js'
import { BelongsToClientContract } from '../../../../adonis-typings/relations.js'

import { BelongsTo } from './index.js'
import { managedTransaction } from '../../../utils/index.js'
import { BelongsToQueryBuilder } from './query_builder.js'
import { BelongsToSubQueryBuilder } from './sub_query_builder.js'

/**
 * Query client for executing queries in scope to the belongsTo relationship.
 */
export class BelongsToQueryClient implements BelongsToClientContract<BelongsTo, LucidModel> {
  constructor(
    public relation: BelongsTo,
    private parent: LucidRow,
    private client: QueryClientContract
  ) {}

  /**
   * Generate a query builder instance
   */
  static query(client: QueryClientContract, relation: BelongsTo, rows: OneOrMany<LucidRow>) {
    const query = new BelongsToQueryBuilder(client.knexQuery(), client, rows, relation)

    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Generate a eager query
   */
  static eagerQuery(client: QueryClientContract, relation: BelongsTo, rows: OneOrMany<LucidRow>) {
    const query = new BelongsToQueryBuilder(client.knexQuery(), client, rows, relation)

    query.isRelatedPreloadQuery = true
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns an instance of the subquery
   */
  static subQuery(client: QueryClientContract, relation: BelongsTo) {
    const query = new BelongsToSubQueryBuilder(client.knexQuery(), client, relation)
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns instance of query builder
   */
  query(): any {
    return BelongsToQueryClient.query(this.client, this.relation, this.parent)
  }

  /**
   * Associate the related model with the parent model
   */
  async associate(related: LucidRow) {
    await managedTransaction(this.parent.$trx || this.client, async (trx) => {
      related.$trx = trx
      await related.save()

      this.relation.hydrateForPersistance(this.parent, related)
      this.parent.$trx = trx
      await this.parent.save()
    })
  }

  /**
   * Drop association
   */
  async dissociate() {
    ;(this.parent as any)[this.relation.foreignKey] = null
    await this.parent.save()
  }
}
