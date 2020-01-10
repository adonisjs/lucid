/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import knex from 'knex'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract } from '@ioc:Adonis/Lucid/Model'
import { DBQueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { RelationBaseQueryBuilderContract, RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'

import { ModelQueryBuilder } from '../../QueryBuilder'

/**
 * Base query builder for ORM relationships
 */
export abstract class BaseQueryBuilder extends ModelQueryBuilder implements RelationBaseQueryBuilderContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    relation: RelationshipsContract,
    private isEager: boolean,
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
      relation: this.profilerData(),
    }))
  }

  protected abstract profilerData (): any

  /**
   * The relationship query builder must implement this method
   * to apply relationship related constraints
   */
  protected abstract applyConstraints (): void

  /**
   * Returns the sql query keys for the join query
   */
  protected abstract getRelationKeys (): string[]

  /**
   * Returns the name of the query action
   */
  protected queryAction (): string {
    let action = this.knexQuery['_method']
    if (action === 'del') {
      action = 'delete'
    }

    if (action === 'select' && this.isEager) {
      action = 'preload'
    }

    return action
  }

  /**
   * Selects the relation keys. Invoked by the preloader
   */
  public $selectRelationKeys (): this {
    const columns = this.knexQuery['_statements'].find((statement: any) => {
      return statement.grouping && statement.grouping === 'columns'
    })

    if (!columns) {
      return this
    }

    /**
     * Add the relation keys to the select statement, when user has defined
     * one or more columns and forgot to define the relation keys.
     */
    this.getRelationKeys().forEach((key) => {
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
