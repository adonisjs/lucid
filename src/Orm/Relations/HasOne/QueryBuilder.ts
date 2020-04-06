/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import knex from 'knex'
import { LucidRow } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

import { HasOne } from './index'
import { getValue, unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class HasOneQueryBuilder extends BaseQueryBuilder {
  protected appliedConstraints: boolean = false

  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: LucidRow | LucidRow[],
    private relation: HasOne,
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new HasOneQueryBuilder($builder, this.client, this.parent, this.relation)
        subQuery.isSubQuery = true
        subQuery.isEagerQuery = this.isEagerQuery
        userFn(subQuery)
      }
    })
  }

  /**
   * Profiler data for HasOne relationship
   */
  protected profilerData () {
    return {
      relation: this.relation.type,
      model: this.relation.model.name,
      relatedModel: this.relation.relatedModel().name,
    }
  }

  /**
   * The keys for constructing the join query
   */
  protected getRelationKeys (): string[] {
    return [this.relation.foreignKey]
  }

  /**
   * Clones the current query
   */
  public clone () {
    const clonedQuery = new HasOneQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.parent,
      this.relation,
    )

    this.applyQueryFlags(clonedQuery)
    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.isEagerQuery = this.isEagerQuery
    return clonedQuery
  }

  /**
   * Applies constraint to limit rows to the current relationship
   * only.
   */
  protected applyConstraints () {
    if (this.appliedConstraints) {
      return
    }

    this.appliedConstraints = true
    const queryAction = this.queryAction()

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      this.whereIn(this.relation.foreignKey, unique(this.parent.map((model) => {
        return getValue(model, this.relation.localKey, this.relation, queryAction)
      })))
      return
    }

    /**
     * Query constraints
     */
    const value = getValue(this.parent, this.relation.localKey, this.relation, queryAction)
    this.where(this.relation.foreignKey, value)

    /**
     * Do not add limit when updating or deleting
     */
    if (!['update', 'delete'].includes(queryAction)) {
      this.limit(1)
    }
  }

  /**
   * Dis-allow hasOne pagination
   */
  public paginate (): Promise<any> {
    throw new Error(`Cannot paginate a hasOne relationship "(${this.relation.relationName})"`)
  }
}
