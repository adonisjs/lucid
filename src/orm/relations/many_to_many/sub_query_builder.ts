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
import { LucidModel } from '../../../types/model.js'
import { ManyToManySubQueryBuilderContract } from '../../../types/relations.js'

import { ManyToMany } from './index.js'
import { PivotHelpers } from './pivot_helpers.js'
import { BaseSubQueryBuilder } from '../base/sub_query_builder.js'
/**
 * Exposes the API to construct sub queries for a many to many relationships
 */
export class ManyToManySubQueryBuilder
  extends BaseSubQueryBuilder
  implements ManyToManySubQueryBuilderContract<LucidModel>
{
  /**
   * Pivot helpers provides the implementation for pivot table constraints
   * and clauses
   */
  private pivotHelpers = new PivotHelpers(this, false)

  /**
   * Reference to the related table
   */
  private relatedTable

  private hasSelfRelation

  /**
   * Whether or not the constraints has been applied
   */
  protected appliedConstraints: boolean = false

  isChildQuery = false

  constructor(
    public builder: Knex.QueryBuilder,
    public client: QueryClientContract,
    public relation: ManyToMany
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new ManyToManySubQueryBuilder($builder, this.client, this.relation)
        subQuery.isChildQuery = true
        userFn(subQuery)
        subQuery.applyWhere()
      }
    })
    this.relatedTable = this.relation.relatedModel().table
    this.hasSelfRelation = this.relatedTable === this.relation.model.table
  }

  /**
   * Prefixes the related table name to a column
   */
  private prefixRelatedTable(column: string) {
    if (column.includes('.')) {
      return column
    }

    if (this.hasSelfRelation) {
      return `${this.selfJoinAlias}.${column}`
    }

    return `${this.relatedTable}.${column}`
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
   * The keys for constructing the join query
   */
  protected getRelationKeys(): string[] {
    return [`${this.relation.relatedModel().table}.${this.relation.relatedKeyColumnName}`]
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
    const localTable = this.relation.model.table
    let tablePrefix = this.relatedTable

    /**
     * In case of self joins, we must alias the table selection
     */
    if (this.relation.relatedModel() === this.relation.model) {
      this.knexQuery.from(`${this.relatedTable} as ${this.selfJoinAlias}`)
      tablePrefix = this.selfJoinAlias
    }

    this.innerJoin(
      this.relation.pivotTable,
      `${tablePrefix}.${this.relation.relatedKeyColumnName}`,
      `${this.relation.pivotTable}.${this.relation.pivotRelatedForeignKey}`
    )

    this.wrapExisting().where(
      `${localTable}.${this.relation.localKeyColumnName}`,
      this.client.ref(this.pivotHelpers.prefixPivotTable(this.relation.pivotForeignKey))
    )
  }

  /**
   * Select keys from the related table
   */
  select(...args: any[]): this {
    let columns = args
    if (Array.isArray(args[0])) {
      columns = args[0]
    }

    this.knexQuery.select(this.transformRelatedTableColumns(columns))
    return this
  }

  /**
   * Add where clause with pivot table prefix
   */
  wherePivot(key: any, operator?: any, value?: any): this {
    this.pivotHelpers.wherePivot('and', key, operator, value)
    return this
  }

  /**
   * Add or where clause with pivot table prefix
   */
  orWherePivot(key: any, operator?: any, value?: any): this {
    this.pivotHelpers.wherePivot('or', key, operator, value)
    return this
  }

  /**
   * Alias for wherePivot
   */
  andWherePivot(key: any, operator?: any, value?: any): this {
    return this.wherePivot(key, operator, value)
  }

  /**
   * Add where not pivot
   */
  whereNotPivot(key: any, operator?: any, value?: any): this {
    this.pivotHelpers.wherePivot('not', key, operator, value)
    return this
  }

  /**
   * Add or where not pivot
   */
  orWhereNotPivot(key: any, operator?: any, value?: any): this {
    this.pivotHelpers.wherePivot('orNot', key, operator, value)
    return this
  }

  /**
   * Alias for `whereNotPivot`
   */
  andWhereNotPivot(key: any, operator?: any, value?: any): this {
    return this.whereNotPivot(key, operator, value)
  }

  /**
   * Adds where in clause
   */
  whereInPivot(key: any, value: any) {
    this.pivotHelpers.whereInPivot('and', key, value)
    return this
  }

  /**
   * Adds or where in clause
   */
  orWhereInPivot(key: any, value: any) {
    this.pivotHelpers.whereInPivot('or', key, value)
    return this
  }

  /**
   * Alias from `whereInPivot`
   */
  andWhereInPivot(key: any, value: any): this {
    return this.whereInPivot(key, value)
  }

  /**
   * Adds where not in clause
   */
  whereNotInPivot(key: any, value: any) {
    this.pivotHelpers.whereInPivot('not', key, value)
    return this
  }

  /**
   * Adds or where not in clause
   */
  orWhereNotInPivot(key: any, value: any) {
    this.pivotHelpers.whereInPivot('orNot', key, value)
    return this
  }

  /**
   * Alias from `whereNotInPivot`
   */
  andWhereNotInPivot(key: any, value: any): this {
    return this.whereNotInPivot(key, value)
  }

  /**
   * Same as "whereNull", but for the pivot table only
   */
  whereNullPivot(key: string): this {
    this.pivotHelpers.whereNullPivot('and', key)
    return this
  }

  /**
   * Same as "orWhereNull", but for the pivot table only
   */
  orWhereNullPivot(key: string): this {
    this.pivotHelpers.whereNullPivot('or', key)
    return this
  }

  /**
   * Same as "andWhereNull", but for the pivot table only
   */
  andWhereNullPivot(key: string): this {
    return this.whereNullPivot(key)
  }

  /**
   * Same as "whereNotNull", but for the pivot table only
   */
  whereNotNullPivot(key: string): this {
    this.pivotHelpers.whereNullPivot('not', key)
    return this
  }

  /**
   * Same as "orWhereNotNull", but for the pivot table only
   */
  orWhereNotNullPivot(key: string): this {
    this.pivotHelpers.whereNullPivot('orNot', key)
    return this
  }

  /**
   * Same as "andWhereNotNull", but for the pivot table only
   */
  andWhereNotNullPivot(key: string): this {
    return this.whereNotNullPivot(key)
  }

  /**
   * Select pivot columns
   */
  pivotColumns(columns: string[]): this {
    this.pivotHelpers.pivotColumns(columns)
    return this
  }

  /**
   * Clones the current query
   */
  clone() {
    const clonedQuery = new ManyToManySubQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.relation
    )

    this.applyQueryFlags(clonedQuery)
    clonedQuery.appliedConstraints = this.appliedConstraints
    clonedQuery.debug(this.debugQueries)
    clonedQuery.reporterData(this.customReporterData)
    return clonedQuery
  }
}
