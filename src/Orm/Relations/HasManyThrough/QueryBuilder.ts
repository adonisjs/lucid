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

import { HasManyThrough } from './index'
import { BaseQueryBuilder } from '../Base/QueryBuilder'
import { getValue, unique, isObject } from '../../../utils'
import { SimplePaginator } from '../../../Database/Paginator/SimplePaginator'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class HasManyThroughQueryBuilder extends BaseQueryBuilder {
  protected cherryPickingKeys: boolean = false
  protected appliedConstraints: boolean = false

  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: LucidRow | LucidRow[],
    private relation: HasManyThrough,
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new HasManyThroughQueryBuilder($builder, this.client, this.parent, this.relation)
        subQuery.isSubQuery = true
        subQuery.isEagerQuery = this.isEagerQuery
        userFn(subQuery)
      }
    })
  }

  /**
   * Profiler data for HasManyThrough relationship
   */
  protected profilerData () {
    return {
      relation: this.relation.type,
      model: this.relation.model.name,
      throughModel: this.relation.throughModel().name,
      relatedModel: this.relation.relatedModel().name,
    }
  }

  /**
   * The keys for constructing the join query
   */
  protected getRelationKeys (): string[] {
    return [this.relation.throughForeignKeyColumnName]
  }

  /**
   * Adds where constraint to the pivot table
   */
  private addWhereConstraints (builder: HasManyThroughQueryBuilder) {
    const queryAction = this.queryAction()
    const throughTable = this.relation.throughModel().table

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      builder.whereIn(
        `${throughTable}.${this.relation.foreignKeyColumnName}`,
        unique(this.parent.map((model) => {
          return getValue(model, this.relation.localKey, this.relation, queryAction)
        })),
      )
      return
    }

    /**
     * Query constraints
     */
    const value = getValue(this.parent, this.relation.localKey, this.relation, queryAction)
    builder.where(`${throughTable}.${this.relation.foreignKeyColumnName}`, value)
  }

  /**
   * Transforms the selected column names by prefixing the
   * table name
   */
  private transformRelatedTableColumns (columns: any[]) {
    const relatedTable = this.relation.relatedModel().table

    return columns.map((column) => {
      if (typeof (column) === 'string') {
        return `${relatedTable}.${column}`
      }

      if (Array.isArray(column)) {
        return this.transformRelatedTableColumns(column)
      }

      if (isObject(column)) {
        return Object.keys(column).reduce((result, alias) => {
          result[alias] = `${relatedTable}.${column[alias]}`
          return result
        }, {})
      }

      return column
    })
  }

  /**
   * Executes the pagination query for the relationship
   */
  private async paginateRelated (page: number, perPage: number) {
    const countQuery = this.clone().clearOrder().clearLimit().clearOffset().clearSelect().count('* as total')
    const aggregateQuery = await countQuery.exec()
    const total = this.hasGroupBy ? aggregateQuery.length : aggregateQuery[0].total

    const results = total > 0 ? await this.forPage(page, perPage).exec() : []
    return new SimplePaginator(results, total, perPage, page)
  }

  /**
   * Select keys from the related table
   */
  public select (...args: any): this {
    this.cherryPickingKeys = true
    this.knexQuery.select(this.transformRelatedTableColumns(args))
    return this
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

    const throughTable = this.relation.throughModel().table
    const relatedTable = this.relation.relatedModel().table

    if (['delete', 'update'].includes(this.queryAction())) {
      this.whereIn(`${relatedTable}.${this.relation.throughForeignKeyColumnName}`, (subQuery) => {
        subQuery.from(throughTable)
        this.addWhereConstraints(subQuery)
      })
      return
    }

    /**
     * Add select statements only when not running aggregate
     * queries. The end user can still select columns
     */
    if (!this.hasAggregates) {
      /**
       * Select * from related model when user is not cherry picking
       * keys
       */
      if (!this.cherryPickingKeys) {
        this.select('*')
      }

      /**
       * Selecting all from the related table, along with the foreign key of the
       * through table.
       */
      this.knexQuery.select(
        `${throughTable}.${this.relation.foreignKeyColumnName} as ${this.relation.throughAlias(this.relation.foreignKeyColumnName)}`,
      )
    }

    /**
     * Inner join
     */
    this.innerJoin(
      throughTable,
      `${throughTable}.${this.relation.throughLocalKeyColumnName}`,
      `${relatedTable}.${this.relation.throughForeignKeyColumnName}`,
    )

    /**
     * Adding where constraints
     */
    this.addWhereConstraints(this)
  }

  /**
   * Clones the current query
   */
  public clone () {
    const clonedQuery = new HasManyThroughQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.parent,
      this.relation,
    )

    this.applyQueryFlags(clonedQuery)
    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.cherryPickingKeys = this.cherryPickingKeys
    clonedQuery.isEagerQuery = this.isEagerQuery
    return clonedQuery
  }

  /**
   * Paginate through rows inside a given table
   */
  public paginate (page: number, perPage: number = 20) {
    if (this.isEagerQuery) {
      throw new Error(`Cannot paginate relationship "${this.relation.relationName}" during preload`)
    }
    return this.paginateRelated(page, perPage)
  }
}
