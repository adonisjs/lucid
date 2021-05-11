/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { LucidModel } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { RelationSubQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { HasOne } from './index'
import { BaseSubQueryBuilder } from '../Base/SubQueryBuilder'

export class HasOneSubQueryBuilder
  extends BaseSubQueryBuilder
  implements RelationSubQueryBuilderContract<LucidModel> {
  protected appliedConstraints: boolean = false

  constructor(builder: Knex.QueryBuilder, client: QueryClientContract, private relation: HasOne) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new HasOneSubQueryBuilder($builder, this.client, this.relation)
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
  public clone() {
    const clonedQuery = new HasOneSubQueryBuilder(
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
      `${localTable}.${this.relation.localKeyColumName}`,
      this.client.ref(`${tablePrefix}.${this.relation.foreignKeyColumName}`)
    )
  }
}
