/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ManyToManyQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { ManyToMany } from './index'
import { PivotHelpers } from './PivotHelpers'
import { getValue, unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class ManyToManyQueryBuilder
  extends BaseQueryBuilder
  implements ManyToManyQueryBuilderContract<LucidModel, LucidModel> {
  private pivotQuery = false
  private relatedTable = this.relation.relatedModel().table
  private pivotHelpers = new PivotHelpers(this, true)

  protected cherryPickingKeys: boolean = false
  protected appliedConstraints: boolean = false

  /**
   * A boolean to know if query build targets only the pivot
   * table or not
   */
  public get isPivotOnlyQuery() {
    return this.pivotQuery
  }
  public set isPivotOnlyQuery(pivotOnly) {
    this.pivotQuery = pivotOnly

    /**
     * Get plain object for a pivot only query
     */
    if (this.pivotQuery) {
      this.pojo()
    }
  }

  constructor(
    builder: Knex.QueryBuilder,
    client: QueryClientContract,
    private parent: LucidRow | LucidRow[],
    public relation: ManyToMany
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new ManyToManyQueryBuilder(
          $builder,
          this.client,
          this.parent,
          this.relation
        )
        subQuery.isChildQuery = true
        subQuery.isPivotOnlyQuery = this.isPivotOnlyQuery
        subQuery.isRelatedPreloadQuery = this.isRelatedPreloadQuery
        userFn(subQuery)
        subQuery.applyWhere()
      }
    })
  }

  /**
   * Profiler data for ManyToMany relationship
   */
  protected profilerData() {
    return {
      type: this.relation.type,
      model: this.relation.model.name,
      pivotTable: this.relation.pivotTable,
      relatedModel: this.relation.relatedModel().name,
    }
  }

  /**
   * The keys for constructing the join query
   */
  protected getRelationKeys(): string[] {
    return [`${this.relation.relatedModel().table}.${this.relation.relatedKeyColumnName}`]
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
  private addWhereConstraints() {
    const queryAction = this.queryAction()

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      this.whereInPivot(
        this.relation.pivotForeignKey,
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
    this.wherePivot(this.relation.pivotForeignKey, value)
  }

  /**
   * Transforms the selected column names by prefixing the
   * table name
   */
  private transformRelatedTableColumns(columns: any[]) {
    if (this.isPivotOnlyQuery) {
      return columns
    }

    return columns.map((column) => {
      if (typeof column === 'string') {
        return this.prefixRelatedTable(this.resolveKey(column))
      }
      return this.transformValue(column)
    })
  }

  /**
   * Applying query constraints to scope them to relationship
   * only.
   */
  protected applyConstraints() {
    if (this.appliedConstraints) {
      return
    }

    this.appliedConstraints = true

    if (this.isPivotOnlyQuery || ['delete', 'update'].includes(this.queryAction())) {
      this.from(this.relation.pivotTable)
      this.addWhereConstraints()
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
       * Select columns from the pivot table
       */
      this.pivotColumns(
        [this.relation.pivotForeignKey, this.relation.pivotRelatedForeignKey].concat(
          this.relation.extrasPivotColumns
        )
      )
    }

    /**
     * Add inner join between related model and pivot table
     */
    this.innerJoin(
      this.relation.pivotTable,
      `${this.relatedTable}.${this.relation.relatedKeyColumnName}`,
      `${this.relation.pivotTable}.${this.relation.pivotRelatedForeignKey}`
    )

    this.addWhereConstraints()
    return
  }

  /**
   * Select keys from the related table
   */
  public select(...args: any[]): this {
    let columns = args
    if (Array.isArray(args[0])) {
      columns = args[0]
    }

    this.cherryPickingKeys = true
    this.knexQuery.select(this.transformRelatedTableColumns(columns))
    return this
  }

  /**
   * Add where clause with pivot table prefix
   */
  public wherePivot(key: any, operator?: any, value?: any): this {
    this.pivotHelpers.wherePivot('and', key, operator, value)
    return this
  }

  /**
   * Add or where clause with pivot table prefix
   */
  public orWherePivot(key: any, operator?: any, value?: any): this {
    this.pivotHelpers.wherePivot('or', key, operator, value)
    return this
  }

  /**
   * Alias for wherePivot
   */
  public andWherePivot(key: any, operator?: any, value?: any): this {
    return this.wherePivot(key, operator, value)
  }

  /**
   * Add where not pivot
   */
  public whereNotPivot(key: any, operator?: any, value?: any): this {
    this.pivotHelpers.wherePivot('not', key, operator, value)
    return this
  }

  /**
   * Add or where not pivot
   */
  public orWhereNotPivot(key: any, operator?: any, value?: any): this {
    this.pivotHelpers.wherePivot('orNot', key, operator, value)
    return this
  }

  /**
   * Alias for `whereNotPivot`
   */
  public andWhereNotPivot(key: any, operator?: any, value?: any): this {
    return this.whereNotPivot(key, operator, value)
  }

  /**
   * Adds where in clause
   */
  public whereInPivot(key: any, value: any) {
    this.pivotHelpers.whereInPivot('and', key, value)
    return this
  }

  /**
   * Adds or where in clause
   */
  public orWhereInPivot(key: any, value: any) {
    this.pivotHelpers.whereInPivot('or', key, value)
    return this
  }

  /**
   * Alias from `whereInPivot`
   */
  public andWhereInPivot(key: any, value: any): this {
    return this.whereInPivot(key, value)
  }

  /**
   * Adds where not in clause
   */
  public whereNotInPivot(key: any, value: any) {
    this.pivotHelpers.whereInPivot('not', key, value)
    return this
  }

  /**
   * Adds or where not in clause
   */
  public orWhereNotInPivot(key: any, value: any) {
    this.pivotHelpers.whereInPivot('orNot', key, value)
    return this
  }

  /**
   * Alias from `whereNotInPivot`
   */
  public andWhereNotInPivot(key: any, value: any): this {
    return this.whereNotInPivot(key, value)
  }

  /**
   * Same as "whereNull", but for the pivot table only
   */
  public whereNullPivot(key: string): this {
    this.pivotHelpers.whereNullPivot('and', key)
    return this
  }

  /**
   * Same as "orWhereNull", but for the pivot table only
   */
  public orWhereNullPivot(key: string): this {
    this.pivotHelpers.whereNullPivot('or', key)
    return this
  }

  /**
   * Same as "andWhereNull", but for the pivot table only
   */
  public andWhereNullPivot(key: string): this {
    return this.whereNullPivot(key)
  }

  /**
   * Same as "whereNotNull", but for the pivot table only
   */
  public whereNotNullPivot(key: string): this {
    this.pivotHelpers.whereNullPivot('not', key)
    return this
  }

  /**
   * Same as "orWhereNotNull", but for the pivot table only
   */
  public orWhereNotNullPivot(key: string): this {
    this.pivotHelpers.whereNullPivot('orNot', key)
    return this
  }

  /**
   * Same as "andWhereNotNull", but for the pivot table only
   */
  public andWhereNotNullPivot(key: string): this {
    return this.whereNotNullPivot(key)
  }

  /**
   * Select pivot columns
   */
  public pivotColumns(columns: string[]): this {
    this.pivotHelpers.pivotColumns(columns)
    return this
  }

  /**
   * Clones query
   */
  public clone() {
    this.applyConstraints()
    const clonedQuery = new ManyToManyQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.parent,
      this.relation
    )

    this.applyQueryFlags(clonedQuery)
    clonedQuery.isPivotOnlyQuery = this.isPivotOnlyQuery
    clonedQuery.cherryPickingKeys = this.cherryPickingKeys
    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.isRelatedPreloadQuery = this.isRelatedPreloadQuery
    return clonedQuery
  }

  /**
   * Paginate through rows inside a given table
   */
  public paginate(page: number, perPage: number = 20) {
    if (this.isRelatedPreloadQuery) {
      throw new Error(`Cannot paginate relationship "${this.relation.relationName}" during preload`)
    }

    return super.paginate(page, perPage)
  }

  /**
   * Returns the group limit query
   */
  public getGroupLimitQuery() {
    const { direction, column } = this.groupConstraints.orderBy || {
      column: this.prefixRelatedTable(this.resolveKey(this.relation.relatedModel().primaryKey)),
      direction: 'desc',
    }

    const rowName = 'adonis_group_limit_counter'
    const partitionBy = `PARTITION BY ${this.pivotHelpers.prefixPivotTable(
      this.relation.pivotForeignKey
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
