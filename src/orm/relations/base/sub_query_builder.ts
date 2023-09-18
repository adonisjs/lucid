/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { DBQueryCallback } from '../../../../adonis-typings/querybuilder.js'
import { QueryClientContract } from '../../../../adonis-typings/database.js'
import { LucidModel } from '../../../../adonis-typings/model.js'
import {
  RelationSubQueryBuilderContract,
  RelationshipsContract,
} from '../../../../adonis-typings/relations.js'
import { ModelQueryBuilder } from '../../query_builder/index.js'

/**
 * Base query builder for ORM Relationships
 */
export abstract class BaseSubQueryBuilder
  extends ModelQueryBuilder
  implements RelationSubQueryBuilderContract<LucidModel>
{
  /**
   * The counter for the self join alias. Usually will be set by
   * the consumer
   */
  selfJoinCounter: number = 0

  /**
   * Alias for the self join table
   */
  get selfJoinAlias(): string {
    return `adonis_temp_${this.selfJoinCounter}`
  }

  /**
   * Is query a relationship query obtained using `related('relation').query()`
   */
  get isRelatedQuery(): false {
    return false
  }

  /**
   * Is query a relationship query obtained using `related('relation').subQuery()`
   */
  get isRelatedSubQuery(): true {
    return true
  }

  /**
   * Is query a relationship query obtained using one of the preload methods.
   */
  get isRelatedPreloadQuery(): false {
    return false
  }

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
   * Returns the sql query keys for the join query
   */
  protected abstract getRelationKeys(): string[]

  /**
   * The relationship query builder must implement this method
   * to apply relationship related constraints
   */
  protected abstract applyConstraints(): void

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
   * Get query sql
   */
  toSQL() {
    this.prepare()
    return super.toSQL()
  }

  /**
   * prepare
   */
  prepare() {
    this.applyConstraints()
    return this
  }

  /**
   * Executing subqueries is not allowed. It is disabled in static types, but
   * in case someone by-pass typescript checks to invoke it
   */
  exec(): any {
    throw new Error('Cannot execute relationship subqueries')
  }

  paginate(): any {
    throw new Error('Cannot execute relationship subqueries')
  }

  update(): any {
    throw new Error('Cannot execute relationship subqueries')
  }

  del(): any {
    throw new Error('Cannot execute relationship subqueries')
  }

  first(): any {
    throw new Error('Cannot execute relationship subqueries')
  }

  firstOrFail(): any {
    throw new Error('Cannot execute relationship subqueries')
  }
}
