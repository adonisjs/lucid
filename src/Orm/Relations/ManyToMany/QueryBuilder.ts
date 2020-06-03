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
import { ManyToManyQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { ManyToMany } from './index'
import { getValue, unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'
import { SimplePaginator } from '../../../Database/Paginator/SimplePaginator'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class ManyToManyQueryBuilder extends BaseQueryBuilder implements ManyToManyQueryBuilderContract<
  LucidModel,
  LucidModel
> {
  private pivotQuery = false
  private relatedTable = this.relation.relatedModel().table
  protected cherryPickingKeys: boolean = false
  protected appliedConstraints: boolean = false

  /**
   * A boolean to know if query build targets only the pivot
   * table or not
   */
  public get isPivotOnlyQuery () {
    return this.pivotQuery
  }
  public set isPivotOnlyQuery (pivotOnly) {
    this.pivotQuery = pivotOnly
    this.wrapResultsToModelInstances = !this.pivotQuery
  }

  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: LucidRow | LucidRow[],
    private relation: ManyToMany,
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new ManyToManyQueryBuilder($builder, this.client, this.parent, this.relation)
        subQuery.isSubQuery = true
        subQuery.isPivotOnlyQuery = this.isPivotOnlyQuery
        subQuery.isEagerQuery = this.isEagerQuery
        userFn(subQuery)
      }
    })
  }

  /**
   * Profiler data for ManyToMany relationship
   */
  protected profilerData () {
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
  protected getRelationKeys (): string[] {
    return [
      `${this.relation.relatedModel().table}.${this.relation.relatedKeyColumnName}`,
    ]
  }

  /**
   * Prefixes the pivot table name to a column
   */
  private prefixPivotTable (column: string) {
    return this.isPivotOnlyQuery ? column : `${this.relation.pivotTable}.${column}`
  }

  /**
   * Prefixes the related table name to a column
   */
  private prefixRelatedTable (column: string) {
    return `${this.relatedTable}.${column}`
  }

  /**
   * Adds where constraint to the pivot table
   */
  private addWhereConstraints () {
    const queryAction = this.queryAction()

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      this.whereInPivot(this.relation.pivotForeignKey, unique(this.parent.map((model) => {
        return getValue(model, this.relation.localKey, this.relation, queryAction)
      })))
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
  private transformRelatedTableColumns (columns: any[]) {
    if (this.isPivotOnlyQuery) {
      return columns
    }

    return columns.map((column) => {
      if (typeof (column) === 'string') {
        return this.prefixRelatedTable(this.resolveKey(column))
      }
      return this.transformValue(column)
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
  public select (...args: any[]): this {
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
  public wherePivot (key: any, operator?: any, value?: any): this {
    if (value !== undefined) {
      this.knexQuery.where(this.prefixPivotTable(key), operator, this.transformValue(value))
    } else if (operator !== undefined) {
      this.knexQuery.where(this.prefixPivotTable(key), this.transformValue(operator))
    } else {
      this.knexQuery.where(this.transformCallback(key))
    }

    return this
  }

  /**
   * Add or where clause with pivot table prefix
   */
  public orWherePivot (key: any, operator?: any, value?: any): this {
    if (value !== undefined) {
      this.knexQuery.orWhere(this.prefixPivotTable(key), operator, this.transformValue(value))
    } else if (operator !== undefined) {
      this.knexQuery.orWhere(this.prefixPivotTable(key), this.transformValue(operator))
    } else {
      this.knexQuery.orWhere(this.transformCallback(key))
    }

    return this
  }

  /**
   * Alias for wherePivot
   */
  public andWherePivot (key: any, operator?: any, value?: any): this {
    return this.wherePivot(key, operator, value)
  }

  /**
   * Add where not pivot
   */
  public whereNotPivot (key: any, operator?: any, value?: any): this {
    if (value !== undefined) {
      this.knexQuery.whereNot(this.prefixPivotTable(key), operator, this.transformValue(value))
    } else if (operator !== undefined) {
      this.knexQuery.whereNot(this.prefixPivotTable(key), this.transformValue(operator))
    } else {
      this.knexQuery.whereNot(this.transformCallback(key))
    }

    return this
  }

  /**
   * Add or where not pivot
   */
  public orWhereNotPivot (key: any, operator?: any, value?: any): this {
    if (value !== undefined) {
      this.knexQuery.orWhereNot(this.prefixPivotTable(key), operator, this.transformValue(value))
    } else if (operator !== undefined) {
      this.knexQuery.orWhereNot(this.prefixPivotTable(key), this.transformValue(operator))
    } else {
      this.knexQuery.orWhereNot(this.transformCallback(key))
    }

    return this
  }

  /**
   * Alias for `whereNotPivot`
   */
  public andWhereNotPivot (key: any, operator?: any, value?: any): this {
    return this.whereNotPivot(key, operator, value)
  }

  /**
   * Adds where in clause
   */
  public whereInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this.prefixPivotTable(one))
      : this.prefixPivotTable(key)

    this.knexQuery.whereIn(key, value)
    return this
  }

  /**
   * Adds or where in clause
   */
  public orWhereInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this.prefixPivotTable(one))
      : this.prefixPivotTable(key)

    this.knexQuery.orWhereIn(key, value)
    return this
  }

  /**
   * Alias from `whereInPivot`
   */
  public andWhereInPivot (key: any, value: any): this {
    return this.whereInPivot(key, value)
  }

  /**
   * Adds where not in clause
   */
  public whereNotInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this.prefixPivotTable(one))
      : this.prefixPivotTable(key)

    this.knexQuery.whereNotIn(key, value)
    return this
  }

  /**
   * Adds or where not in clause
   */
  public orWhereNotInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this.prefixPivotTable(one))
      : this.prefixPivotTable(key)

    this.knexQuery.orWhereNotIn(key, value)
    return this
  }

  /**
   * Alias from `whereNotInPivot`
   */
  public andWhereNotInPivot (key: any, value: any): this {
    return this.whereNotInPivot(key, value)
  }

  /**
   * Select pivot columns
   */
  public pivotColumns (columns: string[]): this {
    this.knexQuery.select(columns.map((column) => {
      return `${this.prefixPivotTable(column)} as ${this.relation.pivotAlias(column)}`
    }))
    return this
  }

  /**
   * Applying query constraints to scope them to relationship
   * only.
   */
  protected applyConstraints () {
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
        [
          this.relation.pivotForeignKey,
          this.relation.pivotRelatedForeignKey,
        ].concat(this.relation.extrasPivotColumns),
      )
    }

    /**
     * Add inner join between related model and pivot table
     */
    this.innerJoin(
      this.relation.pivotTable,
      `${this.relation.relatedModel().table}.${this.relation.relatedKeyColumnName}`,
      `${this.relation.pivotTable}.${this.relation.pivotRelatedForeignKey}`,
    )

    this.addWhereConstraints()
    return
  }

  /**
   * Clones query
   */
  public clone () {
    this.applyConstraints()
    const clonedQuery = new ManyToManyQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.parent,
      this.relation,
    )

    this.applyQueryFlags(clonedQuery)
    clonedQuery.cherryPickingKeys = this.cherryPickingKeys
    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.isPivotOnlyQuery = this.isPivotOnlyQuery
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

  /**
   * Returns the group limit query
   */
  public getGroupLimitQuery () {
    const rowName = 'ADONIS_GROUP_LIMIT_COUNTER'
    const primaryColumn = this.resolveKey(this.relation.relatedModel().primaryKey)
    const partitionBy = `PARTITION BY ${this.prefixPivotTable(this.relation.pivotForeignKey)}`
    const orderBy = `ORDER BY ${this.groupConstraints.orderBy || `${this.prefixRelatedTable(primaryColumn)} DESC`}`

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
