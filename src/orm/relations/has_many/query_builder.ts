/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Knex } from 'knex'
import { type QueryClientContract } from '../../../types/database.js'
import { type LucidRow, type LucidModel } from '../../../types/model.js'
import { type HasManyQueryBuilderContract } from '../../../types/relations.js'

import { type HasMany } from './index.js'
import { getNullableValue, unique } from '../../../utils/index.js'
import { BaseQueryBuilder } from '../base/query_builder.js'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class HasManyQueryBuilder
  extends BaseQueryBuilder
  implements HasManyQueryBuilderContract<LucidModel, LucidModel>
{
  protected appliedConstraints: boolean = false

  constructor(
    builder: Knex.QueryBuilder,
    client: QueryClientContract,
    private parent: LucidRow | LucidRow[],
    private relation: HasMany
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new HasManyQueryBuilder($builder, this.client, this.parent, this.relation)
        subQuery.isChildQuery = true
        subQuery.isRelatedPreloadQuery = this.isRelatedPreloadQuery
        userFn(subQuery)
        subQuery.applyWhere()
      }
    })
  }

  /**
   * Profiler data for HasMany relationship
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
    return [this.relation.foreignKey]
  }

  /**
   * Clones the current query
   */
  clone() {
    const clonedQuery = new HasManyQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.parent,
      this.relation
    )

    this.applyQueryFlags(clonedQuery)

    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.isRelatedPreloadQuery = this.isRelatedPreloadQuery
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

    const queryAction = this.queryAction()
    this.appliedConstraints = true

    /**
     * Eager query constraints
     */
    if (Array.isArray(this.parent)) {
      this.wrapExisting().whereIn(
        this.relation.foreignKey,
        unique(
          this.parent
            .map((model) => {
              return getNullableValue(model, this.relation.localKey, this.relation, queryAction)
            })
            .filter((value) => value !== null)
        )
      )
      return
    }

    /**
     * Query constraints
     */
    const value = getNullableValue(this.parent, this.relation.localKey, this.relation, queryAction)
    if (value === null) {
      this.wrapExisting().whereIn(this.relation.foreignKey, [])
      return
    }

    this.wrapExisting().where(this.relation.foreignKey, value)
  }

  /**
   * Same as standard model query builder paginate method. But ensures that
   * it is not invoked during eagerloading
   */
  paginate(page: number, perPage: number = 20) {
    if (this.isRelatedPreloadQuery) {
      throw new Error(`Cannot paginate relationship "${this.relation.relationName}" during preload`)
    }

    this.applyConstraints()
    return super.paginate(page, perPage)
  }

  /**
   * Returns the group limit query
   */
  getGroupLimitQuery() {
    const { direction, column } = this.groupConstraints.orderBy || {
      column: this.resolveKey(this.relation.relatedModel().primaryKey),
      direction: 'desc',
    }

    const rowName = 'adonis_group_limit_counter'

    /**
     * Select * when no columns are selected
     */
    if (!this.getSelectedColumns()) {
      this.select('*')
    }

    this.select(
      this.client.raw(
        `row_number() over (PARTITION BY ?? ORDER BY ?? ${direction}) as ${rowName}`,
        [this.relation.foreignKeyColumnName, column]
      )
    ).as('adonis_temp')

    const groupQuery = this.relation.relatedModel().query()
    groupQuery.usePreloader(this.preloader)
    groupQuery.sideload(this.sideloaded)
    groupQuery.debug(this.debugQueries)
    this.customReporterData && groupQuery.reporterData(this.customReporterData)

    return groupQuery.from(this).where(rowName, '<=', this.groupConstraints.limit!)
  }
}
