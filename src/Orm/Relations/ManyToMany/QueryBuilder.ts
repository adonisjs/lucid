/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../../adonis-typings/index.ts" />

import knex from 'knex'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { RelationContract, ManyToManyQueryBuilderContract } from '@ioc:Adonis/Lucid/Model'

import { ModelQueryBuilder } from '../../QueryBuilder'

/**
 * Query builder with many to many relationships
 */
export class ManyToManyQueryBuilder extends ModelQueryBuilder implements ManyToManyQueryBuilderContract<any> {
  constructor (
    builder: knex.QueryBuilder,
    private _relation: RelationContract,
    client: QueryClientContract,
  ) {
    super(builder, _relation.relatedModel(), client, (userFn) => {
      return (builder) => {
        userFn(new ManyToManyQueryBuilder(builder, this._relation, this.client))
      }
    })
  }

  /**
   * Prefixes the pivot table name to the key
   */
  private _prefixPivotTable (key: string) {
    return `${this._relation['pivotTable']}.${key}`
  }

  /**
   * Add where clause with pivot table prefix
   */
  public wherePivot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.where(this._prefixPivotTable(key), operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.where(this._prefixPivotTable(key), this.$transformValue(operator))
    } else {
      this.$knexBuilder.where(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Add or where clause with pivot table prefix
   */
  public orWherePivot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.orWhere(this._prefixPivotTable(key), operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.orWhere(this._prefixPivotTable(key), this.$transformValue(operator))
    } else {
      this.$knexBuilder.orWhere(this.$transformCallback(key))
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
    if (value) {
      this.$knexBuilder.whereNot(this._prefixPivotTable(key), operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.whereNot(this._prefixPivotTable(key), this.$transformValue(operator))
    } else {
      this.$knexBuilder.whereNot(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Add or where not pivot
   */
  public orWhereNotPivot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.orWhereNot(this._prefixPivotTable(key), operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.orWhereNot(this._prefixPivotTable(key), this.$transformValue(operator))
    } else {
      this.$knexBuilder.orWhereNot(this.$transformCallback(key))
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
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this._prefixPivotTable(one))
      : this._prefixPivotTable(key)

    this.$knexBuilder.whereIn(key, value)
    return this
  }

  /**
   * Adds or where in clause
   */
  public orWhereInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this._prefixPivotTable(one))
      : this._prefixPivotTable(key)

    this.$knexBuilder.orWhereIn(key, value)
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
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this._prefixPivotTable(one))
      : this._prefixPivotTable(key)

    this.$knexBuilder.whereNotIn(key, value)
    return this
  }

  /**
   * Adds or where not in clause
   */
  public orWhereNotInPivot (key: any, value: any) {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    key = Array.isArray(key)
      ? key.map((one) => this._prefixPivotTable(one))
      : this._prefixPivotTable(key)

    this.$knexBuilder.orWhereNotIn(key, value)
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
    this.$knexBuilder.select(columns.map((column) => {
      return `${this._prefixPivotTable(column)} as pivot_${column}`
    }))
    return this
  }
}
