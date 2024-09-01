/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { QueryClientContract } from '../../../types/database.js'
import { LucidRow, LucidModel } from '../../../types/model.js'
import { HasManyThroughQueryBuilderContract } from '../../../types/relations.js'

import { HasManyThrough } from './index.js'
import { getValue, unique } from '../../../utils/index.js'
import { BaseQueryBuilder } from '../base/query_builder.js'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class HasManyThroughQueryBuilder
  extends BaseQueryBuilder
  implements HasManyThroughQueryBuilderContract<LucidModel, LucidModel>
{
  protected cherryPickingKeys: boolean = false
  protected appliedConstraints: boolean = false

  private throughTable
  private relatedTable

  constructor(
    builder: Knex.QueryBuilder,
    client: QueryClientContract,
    private parent: LucidRow | LucidRow[],
    private relation: HasManyThrough
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new HasManyThroughQueryBuilder(
          $builder,
          this.client,
          this.parent,
          this.relation
        )
        subQuery.isChildQuery = true
        subQuery.isRelatedPreloadQuery = this.isRelatedPreloadQuery
        userFn(subQuery)
        subQuery.applyWhere()
      }
    })
    this.throughTable = this.relation.throughModel().table
    this.relatedTable = this.relation.relatedModel().table
  }

  /**
   * Prefixes the through table name to a column
   */
  private prefixThroughTable(column: string) {
    return column.includes('.') ? column : `${this.throughTable}.${column}`
  }

  /**
   * Prefixes the related table name to a column
   */
  private prefixRelatedTable(column: string) {
    return column.includes('.') ? column : `${this.relatedTable}.${column}`
  }

  /**
   * Adds where constraint to the pivot table
   */
  private addWhereConstraints(builder: HasManyThroughQueryBuilder) {
    const queryAction = this.queryAction()

    /**
     * Eager query constraints
     */
    if (Array.isArray(this.parent)) {
      builder.whereIn(
        this.prefixThroughTable(this.relation.foreignKeyColumnName),
        unique(
          this.parent.map((model) => {
            return getValue(model, this.relation.localKey, this.relation, queryAction)
          })
        )
      )
      return
    }

    /**
     * Query constraints
     */
    const value = getValue(this.parent, this.relation.localKey, this.relation, queryAction)
    builder.where(this.prefixThroughTable(this.relation.foreignKeyColumnName), value)
  }

  /**
   * Transforms the selected column names by prefixing the
   * table name
   */
  private transformRelatedTableColumns(columns: any[]) {
    return columns.map((column) => {
      if (typeof column === 'string') {
        return this.prefixRelatedTable(this.resolveKey(column))
      }
      return this.transformValue(column)
    })
  }

  /**
   * Profiler data for HasManyThrough relationship
   */
  protected profilerData() {
    return {
      type: this.relation.type,
      model: this.relation.model.name,
      throughModel: this.relation.throughModel().name,
      relatedModel: this.relation.relatedModel().name,
    }
  }

  /**
   * The keys for constructing the join query
   */
  protected getRelationKeys(): string[] {
    return [this.prefixRelatedTable(this.relation.throughForeignKeyColumnName)]
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

    if (['delete', 'update'].includes(this.queryAction())) {
      this.whereIn(
        this.prefixRelatedTable(this.relation.throughForeignKeyColumnName),
        (subQuery: this) => {
          subQuery.from(this.throughTable)
          this.addWhereConstraints(subQuery)
        }
      )
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
        `${this.prefixThroughTable(
          this.relation.foreignKeyColumnName
        )} as ${this.relation.throughAlias(this.relation.foreignKeyColumnName)}`
      )
    }

    /**
     * Inner join
     */
    this.innerJoin(
      this.throughTable,
      this.prefixThroughTable(this.relation.throughLocalKeyColumnName),
      this.prefixRelatedTable(this.relation.throughForeignKeyColumnName)
    )

    /**
     * Adding where constraints
     */
    this.addWhereConstraints(this)
  }

  /**
   * Select keys from the related table
   */
  select(...args: any): this {
    let columns = args
    if (Array.isArray(args[0])) {
      columns = args[0]
    }

    this.cherryPickingKeys = true
    this.knexQuery.select(this.transformRelatedTableColumns(columns))
    return this
  }

  /**
   * Clones the current query
   */
  clone() {
    const clonedQuery = new HasManyThroughQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.parent,
      this.relation
    )

    this.applyQueryFlags(clonedQuery)

    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.cherryPickingKeys = this.cherryPickingKeys
    clonedQuery.isRelatedPreloadQuery = this.isRelatedPreloadQuery
    clonedQuery.debug(this.debugQueries)
    clonedQuery.reporterData(this.customReporterData)

    return clonedQuery
  }

  /**
   * Paginate through rows inside a given table
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
      column: this.prefixRelatedTable(this.resolveKey(this.relation.relatedModel().primaryKey)),
      direction: 'desc',
    }

    const rowName = 'adonis_group_limit_counter'
    const partitionBy = `PARTITION BY ${this.prefixThroughTable(
      this.relation.foreignKeyColumnName
    )}`
    const orderBy = `ORDER BY ${column} ${direction}`

    /**
     * Select * when no columns are selected
     */
    if (!this.getSelectedColumns()) {
      this.select('*')
    }

    this.select(this.client.raw(`row_number() over (${partitionBy} ${orderBy}) as ${rowName}`)).as(
      'adonis_temp'
    )

    const groupQuery = this.relation.relatedModel().query()
    groupQuery.usePreloader(this.preloader)
    groupQuery.sideload(this.sideloaded)
    groupQuery.debug(this.debugQueries)
    this.customReporterData && groupQuery.reporterData(this.customReporterData)

    return groupQuery.from(this).where(rowName, '<=', this.groupConstraints.limit!)
  }
}
