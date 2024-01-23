/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { DBQueryCallback } from '../../../types/querybuilder.js'
import { QueryClientContract } from '../../../types/database.js'
import { LucidRow, LucidModel, ModelQueryBuilderContract } from '../../../types/model.js'
import { RelationshipsContract, RelationQueryBuilderContract } from '../../../types/relations.js'
import { ModelQueryBuilder } from '../../query_builder/index.js'

/**
 * Base query builder for ORM Relationships
 */
export abstract class BaseQueryBuilder
  extends ModelQueryBuilder
  implements RelationQueryBuilderContract<LucidModel, LucidRow>
{
  /**
   * Eager constraints
   */
  protected groupConstraints: {
    limit?: number
    orderBy?: {
      column: string
      direction?: 'asc' | 'desc'
    }
  } = {}

  /**
   * Is query a relationship query obtained using `related('relation').query()`
   */
  get isRelatedQuery(): true {
    return true
  }

  /**
   * Is query a relationship query obtained using `related('relation').subQuery()`
   */
  get isRelatedSubQuery(): false {
    return false
  }

  /**
   * Is query a relationship query obtained using one of the preload methods.
   */
  isRelatedPreloadQuery: boolean = false

  constructor(
    builder: Knex.QueryBuilder,
    client: QueryClientContract,
    relation: RelationshipsContract,
    dbCallback: DBQueryCallback
  ) {
    super(builder, relation.relatedModel(), client, dbCallback)
  }

  /**
   * Returns the selected columns
   */
  protected getSelectedColumns(): undefined | { grouping: 'columns'; value: any[] } {
    return (this.knexQuery as any)['_statements'].find(
      ({ grouping }: any) => grouping === 'columns'
    )
  }

  /**
   * Returns the profiler action. Protected, since the class is extended
   * by relationships
   */
  protected getQueryData() {
    return Object.assign(this.knexQuery.toSQL(), {
      connection: this.client.connectionName,
      inTransaction: this.client.isTransaction,
      model: this.model.name,
      eagerLoading: this.isRelatedPreloadQuery,
      relation: this.profilerData(),
    })
  }

  /**
   * Profiler data for the relationship
   */
  protected abstract profilerData(): any

  /**
   * Returns the sql query keys for the join query
   */
  protected abstract getRelationKeys(): string[]

  /**
   * The relationship query builder must implement this method
   * to apply relationship related constraints
   */
  protected abstract applyConstraints(): void

  /**
   * Must be implemented by relationships to return query which
   * handles the limit with eagerloading.
   */
  protected abstract getGroupLimitQuery(): never | ModelQueryBuilderContract<LucidModel>

  /**
   * Returns the name of the query action. Used mainly for
   * raising descriptive errors
   */
  protected queryAction(): string {
    let action = (this.knexQuery as any)['_method']
    if (action === 'del') {
      action = 'delete'
    }

    if (action === 'select' && this.isRelatedPreloadQuery) {
      action = 'preload'
    }

    return action
  }

  /**
   * Selects the relation keys. Invoked by the preloader
   */
  selectRelationKeys(): this {
    const columns = this.getSelectedColumns()

    /**
     * No columns have been defined, we will let knex do it's job by
     * adding `select *`
     */
    if (!columns) {
      return this
    }

    /**
     * Finally push relation columns to existing selected columns
     */
    this.getRelationKeys().forEach((key) => {
      key = this.resolveKey(key)
      if (!columns.value.includes(key)) {
        columns.value.push(key)
      }
    })

    return this
  }

  /**
   * Define the group limit
   */
  groupLimit(limit: number): this {
    this.groupConstraints.limit = limit
    return this
  }

  /**
   * Define the group limit
   */
  groupOrderBy(column: string, direction?: 'asc' | 'desc'): this {
    this.groupConstraints.orderBy = { column, direction }
    return this
  }

  /**
   * Get query sql
   */
  toSQL() {
    this.applyConstraints()
    if (this.isRelatedPreloadQuery) {
      return this.groupConstraints.limit ? this.getGroupLimitQuery().toSQL() : super.toSQL()
    }

    /**
     * Apply orderBy and limit on the standard query when not
     * an eagerloading query
     */
    if (this.groupConstraints.limit) {
      this.limit(this.groupConstraints.limit)
    }
    if (this.groupConstraints.orderBy) {
      this.orderBy(this.groupConstraints.orderBy.column, this.groupConstraints.orderBy.direction)
    }

    return super.toSQL()
  }

  /**
   * Apply constraints before fetching the first
   * row
   */
  first() {
    this.applyConstraints()
    return super.first()
  }

  /**
   * Execute query
   */
  exec() {
    this.applyConstraints()
    if (this.isRelatedPreloadQuery) {
      return this.groupConstraints.limit ? this.getGroupLimitQuery().exec() : super.exec()
    }

    /**
     * Apply orderBy and limit on the standard query when not
     * an eagerloading query
     */
    if (this.groupConstraints.limit) {
      this.limit(this.groupConstraints.limit)
    }
    if (this.groupConstraints.orderBy) {
      this.orderBy(this.groupConstraints.orderBy.column, this.groupConstraints.orderBy.direction)
    }

    return super.exec()
  }
}
