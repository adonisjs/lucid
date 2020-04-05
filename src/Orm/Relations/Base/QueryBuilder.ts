/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import knex from 'knex'
import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { DBQueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { RelationQueryBuilderContract, RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'

import { ModelQueryBuilder } from '../../QueryBuilder'

/**
 * Base query builder for ORM Relationships
 */
export abstract class BaseQueryBuilder extends ModelQueryBuilder implements RelationQueryBuilderContract<
LucidModel,
LucidRow
> {
  /**
   * A flag to know, if query builder is instantiated for
   * eager loading or not.
   */
  public isEagerQuery: boolean = false

  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    relation: RelationshipsContract,
    dbCallback: DBQueryCallback,
  ) {
    super(builder, relation.relatedModel(), client, dbCallback)
  }

  /**
   * Returns the profiler action. Protected, since the class is extended
   * by relationships
   */
  protected getProfilerAction () {
    if (!this.client.profiler) {
      return null
    }

    return this.client.profiler.profile('sql:query', Object.assign(this['toSQL'](), {
      connection: this.client.connectionName,
      inTransaction: this.client.isTransaction,
      model: this.model.name,
      eagerLoading: this.isEagerQuery,
      relation: this.profilerData(),
    }))
  }

  /**
   * Profiler data for the relationship
   */
  protected abstract profilerData (): any

  /**
   * Returns the sql query keys for the join query
   */
  protected abstract getRelationKeys (): string[]

  /**
   * The relationship query builder must implement this method
   * to apply relationship related constraints
   */
  protected abstract applyConstraints (): void

  /**
   * Returns the name of the query action. Used mainly for
   * raising descriptive errors
   */
  protected queryAction (): string {
    let action = this.knexQuery['_method']
    if (action === 'del') {
      action = 'delete'
    }

    if (action === 'select' && this.isEagerQuery) {
      action = 'preload'
    }

    return action
  }

  /**
   * Selects the relation keys. Invoked by the preloader
   */
  public selectRelationKeys (): this {
    const knexQuery = this.knexQuery
    const columns = knexQuery['_statements'].find(({ grouping }) => grouping === 'columns')

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
  public toSQL () {
    this.applyConstraints()
    return super.toSQL()
  }

  /**
   * Execute query
   */
  public exec () {
    this.applyConstraints()
    return super.exec()
  }
}
