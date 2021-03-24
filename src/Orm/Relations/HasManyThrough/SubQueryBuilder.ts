/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { LucidModel } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { RelationSubQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { HasManyThrough } from './index'
import { BaseSubQueryBuilder } from '../Base/SubQueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class HasManyThroughSubQueryBuilder
  extends BaseSubQueryBuilder
  implements RelationSubQueryBuilderContract<LucidModel> {
  /**
   * A boolean to track if query constraints for the relationship
   * has been applied or not
   */
  protected appliedConstraints: boolean = false

  /**
   * Reference to the related table
   */
  private relatedTable = this.relation.relatedModel().table

  /**
   * Reference to the through table
   */
  private throughTable = this.relation.throughModel().table

  private hasSelfRelation = this.relatedTable === this.relation.model.table

  constructor(
    builder: Knex.QueryBuilder,
    client: QueryClientContract,
    private relation: HasManyThrough
  ) {
    super(builder, client, relation, (userFn) => {
      return ($builder) => {
        const subQuery = new HasManyThroughSubQueryBuilder($builder, this.client, this.relation)
        subQuery.isChildQuery = true
        userFn(subQuery)
        subQuery.applyWhere()
      }
    })
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
    return [this.relation.throughForeignKeyColumnName]
  }

  /**
   * Select keys from the related table
   */
  public select(...args: any): this {
    let columns = args
    if (Array.isArray(args[0])) {
      columns = args[0]
    }

    this.knexQuery.select(this.transformRelatedTableColumns(columns))
    return this
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

    /**
     * In case of self joins, we must alias the table selection
     */
    if (this.relation.relatedModel() === this.relation.model) {
      this.knexQuery.from(`${this.relatedTable} as ${this.selfJoinAlias}`)
    }

    this.innerJoin(
      this.throughTable,
      this.prefixThroughTable(this.relation.throughLocalKeyColumnName),
      this.prefixRelatedTable(this.relation.throughForeignKeyColumnName)
    )

    this.where(
      `${this.relation.model.table}.${this.relation.localKeyColumnName}`,
      this.client.ref(this.prefixThroughTable(this.relation.foreignKeyColumnName))
    )
  }

  /**
   * Clones the current query
   */
  public clone() {
    const clonedQuery = new HasManyThroughSubQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.relation
    )

    this.applyQueryFlags(clonedQuery)
    clonedQuery.appliedConstraints = this.appliedConstraints
    return clonedQuery
  }
}
