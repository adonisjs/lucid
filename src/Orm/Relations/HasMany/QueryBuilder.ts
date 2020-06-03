/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import knex from 'knex'
import { LucidRow, LucidModel } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { HasManyQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { HasMany } from './index'
import { getValue, unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class HasManyQueryBuilder extends BaseQueryBuilder implements HasManyQueryBuilderContract<
  LucidModel,
  LucidModel
> {
  protected appliedConstraints: boolean = false

  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: LucidRow | LucidRow[],
    private relation: HasMany,
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new HasManyQueryBuilder($builder, this.client, this.parent, this.relation)
        subQuery.isSubQuery = true
        subQuery.isEagerQuery = this.isEagerQuery
        userFn(subQuery)
      }
    })
  }

  /**
   * Profiler data for HasMany relationship
   */
  protected profilerData () {
    return {
      type: this.relation.type,
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
    const clonedQuery = new HasManyQueryBuilder(
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

    const queryAction = this.queryAction()
    this.appliedConstraints = true

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
  }

  /**
   * Same as standard model query builder paginate method. But ensures that
   * it is not invoked during eagerloading
   */
  public paginate (page: number, perPage: number = 20) {
    if (this.isEagerQuery) {
      throw new Error(`Cannot paginate relationship "${this.relation.relationName}" during preload`)
    }
    return super.paginate(page, perPage)
  }

  /**
   * Returns the group limit query
   */
  public getGroupLimitQuery () {
    const { direction, column } = this.groupConstraints.orderBy || {
      column: this.resolveKey(this.relation.relatedModel().primaryKey),
      direction: 'desc',
    }

    const rowName = 'ADONIS_GROUP_LIMIT_COUNTER'
    const partitionBy = `PARTITION BY ${this.relation.foreignKeyColumName}`
    const orderBy = `ORDER BY ${column} ${direction}`

    /**
     * Select * when no columns are selected
     */
    if (!this.getSelectedColumns()) {
      this.select('*')
    }

    this
      .select(this.client.raw(`row_number() over (${partitionBy} ${orderBy}) as ${rowName}`))
      .as('ADONIS_TEMP')

    return this.relation
      .relatedModel()
      .query()
      .from(this)
      .where(rowName, '<=', this.groupConstraints.limit!)
  }
}
