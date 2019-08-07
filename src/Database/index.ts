/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/database.ts" />

import * as knex from 'knex'
import { DatabaseQueryBuilderContract, QueryCallback } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'
import { BaseQueryBuilder } from '../BaseQueryBuilder'

/**
 * Wrapping the user function for a query callback and give them
 * a new instance of the `DatabaseQueryBuilder` and not
 * knex.QueryBuilder
 */
function queryCallback (userFn: QueryCallback<DatabaseQueryBuilderContract>) {
  return (builder: knex.QueryBuilder) => {
    // @ts-ignore
    userFn(new DatabaseQueryBuilder(builder))
  }
}

export class DatabaseQueryBuilder extends BaseQueryBuilder implements DatabaseQueryBuilderContract {
  constructor (client: knex.QueryBuilder) {
    super(client, queryCallback)
  }

  private _normalizeAggregateColumns (columns: any, alias?: any): any {
    if (columns.constructor === Object) {
      return Object.keys(columns).reduce((result, key) => {
        result[key] = this.$transformValue(columns[key])
        return result
      }, {})
    }

    if (!alias) {
      throw new Error('Aggregate function needs an alias as 2nd argument')
    }

    return { [alias]: this.$transformValue(columns) }
  }

  // @ts-ignore
  public select (): this {
    this.$knexBuilder.select(...arguments)
    return this
  }

  public count (columns: any, alias?: any): any {
    this.$knexBuilder.count(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  public countDistinct (columns: any, alias?: any): any {
    this.$knexBuilder.countDistinct(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  public min (columns: any, alias?: any): any {
    this.$knexBuilder.min(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  public max (columns: any, alias?: any): any {
    this.$knexBuilder.max(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  public avg (columns: any, alias?: any): any {
    this.$knexBuilder.avg(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  public avgDistinct (columns: any, alias?: any): any {
    this.$knexBuilder.avgDistinct(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  public sum (columns: any, alias?: any): any {
    this.$knexBuilder.sum(this._normalizeAggregateColumns(columns, alias))
    return this
  }
}
