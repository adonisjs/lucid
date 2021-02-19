/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import knex from 'knex'
import { Exception } from '@poppinss/utils'
import { LucidRow } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

import { BelongsTo } from './index'
import { unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class BelongsToQueryBuilder extends BaseQueryBuilder {
  protected appliedConstraints: boolean = false

  constructor(
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: LucidRow | LucidRow[],
    private relation: BelongsTo
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new BelongsToQueryBuilder(
          $builder,
          this.client,
          this.parent,
          this.relation
        )
        subQuery.isRelatedPreloadQuery = this.isRelatedPreloadQuery
        subQuery.isChildQuery = true
        userFn(subQuery)
        subQuery.applyWhere()
      }
    })
  }

  /**
   * Raises exception that FK value is null
   */
  private raiseMissingForeignKey(): never {
    const { relationName, foreignKey } = this.relation
    const modelName = this.relation.model.name

    throw new Exception(
      [
        `Cannot preload "${relationName}", value of "${modelName}.${foreignKey}" is undefined.`,
        'Make sure to set "null" as the default value for foreign keys',
      ].join(' '),
      500
    )
  }

  /**
   * The profiler data for belongsTo relatioship
   */
  protected profilerData() {
    return {
      type: this.relation.type,
      model: this.relation.model.name,
      relatedModel: this.relation.relatedModel().name,
    }
  }

  /**
   * The keys for constructing the join query
   */
  protected getRelationKeys(): string[] {
    return [this.relation.localKey]
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
    const queryAction = this.queryAction()

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      const foreignKeyValues = this.parent
        .map((model) => model[this.relation.foreignKey])
        .filter((foreignKeyValue) => {
          if (foreignKeyValue === undefined) {
            this.raiseMissingForeignKey()
          }
          return foreignKeyValue !== null
        })

      this.whereIn(this.relation.localKey, unique(foreignKeyValues))
      return
    }

    /**
     * Query constraints
     */
    if (this.parent[this.relation.foreignKey] === undefined) {
      this.raiseMissingForeignKey()
    }

    this.where(this.relation.localKey, this.parent[this.relation.foreignKey])

    /**
     * Do not add limit when updating or deleting
     */
    if (!['update', 'delete'].includes(queryAction)) {
      this.limit(1)
    }

    return
  }

  /**
   * Clones the current query
   */
  public clone() {
    const clonedQuery = new BelongsToQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.parent,
      this.relation
    )

    this.applyQueryFlags(clonedQuery)
    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.isRelatedPreloadQuery = this.isRelatedPreloadQuery
    return clonedQuery
  }

  /**
   * Dis-allow belongsTo pagination
   */
  public paginate(): Promise<any> {
    throw new Error(`Cannot paginate a belongsTo relationship "(${this.relation.relationName})"`)
  }

  /**
   * Dis-allow belongsTo group query limit
   */
  public getGroupLimitQuery(): never {
    throw new Error(
      `Cannot apply groupLimit or groupOrderBy on a belongsTo relationship "(${this.relation.relationName})"`
    )
  }
}
