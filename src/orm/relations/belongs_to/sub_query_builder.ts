/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { LucidModel } from '../../../../adonis-typings/model.js'
import { QueryClientContract } from '../../../../adonis-typings/database.js'
import { RelationSubQueryBuilderContract } from '../../../../adonis-typings/relations.js'

import { BelongsTo } from './index.js'
import { BaseSubQueryBuilder } from '../base/sub_query_builder.js'

export class BelongsToSubQueryBuilder
  extends BaseSubQueryBuilder
  implements RelationSubQueryBuilderContract<LucidModel>
{
  protected appliedConstraints: boolean = false

  constructor(
    builder: Knex.QueryBuilder,
    client: QueryClientContract,
    private relation: BelongsTo
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new BelongsToSubQueryBuilder($builder, this.client, this.relation)
        subQuery.isChildQuery = true
        userFn(subQuery)
        subQuery.applyWhere()
      }
    })
  }

  /**
   * The keys for constructing the join query
   */
  protected getRelationKeys(): string[] {
    return [this.relation.foreignKey]
  }

  /**
   * Clones the current query
   */
  clone() {
    const clonedQuery = new BelongsToSubQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.relation
    )

    this.applyQueryFlags(clonedQuery)

    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.debug(this.debugQueries)
    clonedQuery.reporterData(this.customReporterData)

    return clonedQuery
  }

  /**
   * Applies constraint to limit rows to the current relationship
   * only.
   */
  protected applyConstraints() {
    if (this.appliedConstraints) {
      return
    }

    this.appliedConstraints = true

    const relatedTable = this.relation.relatedModel().table
    const localTable = this.relation.model.table
    let tablePrefix = relatedTable

    /**
     * In case of self joins, we must alias the table selection
     */
    if (relatedTable === localTable) {
      this.knexQuery.from(`${relatedTable} as ${this.selfJoinAlias}`)
      tablePrefix = this.selfJoinAlias
    }

    this.wrapExisting().where(
      `${tablePrefix}.${this.relation.localKeyColumName}`,
      this.client.ref(`${localTable}.${this.relation.foreignKeyColumName}`)
    )
  }
}
