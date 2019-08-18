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
import { Exception } from '@poppinss/utils'

import {
  DatabaseQueryBuilderContract,
  QueryCallback,
  TransactionClientContract,
  QueryClientContract,
 } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

import { Chainable } from './Chainable'
import { executeQuery, isInTransaction } from '../utils'

/**
 * Wrapping the user function for a query callback and give them
 * a new instance of the `DatabaseQueryBuilder` and not
 * knex.QueryBuilder
 */
function queryCallback (userFn: QueryCallback<DatabaseQueryBuilderContract>) {
  return (builder: knex.QueryBuilder) => {
    userFn(new DatabaseQueryBuilder(builder))
  }
}

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
export class DatabaseQueryBuilder extends Chainable implements DatabaseQueryBuilderContract {
  constructor (builder: knex.QueryBuilder, private _client?: QueryClientContract) {
    super(builder, queryCallback)
  }

  /**
   * Ensures that we are not executing `update` or `del` when using read only
   * client
   */
  private _ensureCanPerformWrites () {
    if (this._client && this._client.mode === 'read') {
      throw new Exception('Updates and deletes cannot be performed in read mode')
    }
  }

  /**
   * Raises exception when client is not defined
   */
  private _ensureClient () {
    if (!this._client) {
      throw new Exception('Cannot execute query without query client', 500, 'E_PROGRAMMING_EXCEPTION')
    }
  }

  /**
   * Returns the client to be used for the query. This method relies on the
   * query method and will choose the read or write connection whenever
   * required.
   */
  private _getQueryClient () {
    /**
     * Return undefined when no parent client is defined or dialect
     * is sqlite
     */
    if (this._client!.dialect === 'sqlite3') {
      return
    }

    /**
     * Use transaction client directly, since it preloads the
     * connection
     */
    if (isInTransaction(this.$knexBuilder, this._client!)) {
      return
    }

    /**
     * Use write client for updates and deletes
     */
    if (['update', 'del'].includes(this.$knexBuilder['_method'])) {
      return this._client!.getWriteClient().client
    }

    return this._client!.getReadClient().client
  }

  /**
   * Returns the profiler data
   */
  private _getProfilerData () {
    if (!this._client!.profiler) {
      return {}
    }

    return {
      connection: this._client!.connectionName,
    }
  }

  /**
   * Normalizes the columns aggregates functions to something
   * knex can process.
   */
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

  /**
   * Define columns for selection
   */
  public select (): this {
    this.$knexBuilder.select(...arguments)
    return this
  }

  /**
   * Count rows for the current query
   */
  public count (columns: any, alias?: any): this {
    this.$knexBuilder.count(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Count distinct rows for the current query
   */
  public countDistinct (columns: any, alias?: any): this {
    this.$knexBuilder.countDistinct(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of `min` aggregate function
   */
  public min (columns: any, alias?: any): this {
    this.$knexBuilder.min(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of `max` aggregate function
   */
  public max (columns: any, alias?: any): this {
    this.$knexBuilder.max(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of `avg` aggregate function
   */
  public avg (columns: any, alias?: any): this {
    this.$knexBuilder.avg(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of distinct `avg` aggregate function
   */
  public avgDistinct (columns: any, alias?: any): this {
    this.$knexBuilder.avgDistinct(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of `sum` aggregate function
   */
  public sum (columns: any, alias?: any): this {
    this.$knexBuilder.sum(this._normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Perform update by incrementing value for a given column. Increments
   * can be clubbed with `update` as well
   */
  public increment (column: any, counter?: any): this {
    this.$knexBuilder.increment(column, counter)
    return this
  }

  /**
   * Perform update by decrementing value for a given column. Decrements
   * can be clubbed with `update` as well
   */
  public decrement (column: any, counter?: any): this {
    this.$knexBuilder.decrement(column, counter)
    return this
  }

  /**
   * Delete rows under the current query
   */
  public del (): this {
    this._ensureCanPerformWrites()
    this.$knexBuilder.del()
    return this
  }

  /**
   * Clone the current query builder
   */
  public clone (): DatabaseQueryBuilder {
    return new DatabaseQueryBuilder(this.$knexBuilder.clone(), this._client)
  }

  /**
   * Define returning columns
   */
  public returning (columns: any): this {
    this.$knexBuilder.returning(columns)
    return this
  }

  /**
   * Perform update
   */
  public update (columns: any): this {
    this._ensureCanPerformWrites()
    this.$knexBuilder.update(columns)
    return this
  }

  /**
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  public async first (): Promise<any> {
    const result = await this.limit(1).exec()
    return result[0] || null
  }

  /**
   * Required when Promises are extended
   */
  public get [Symbol.toStringTag] () {
    return this.constructor.name
  }

  /**
   * Turn on/off debugging for this query
   */
  public debug (debug: boolean): this {
    this.$knexBuilder.debug(debug)
    return this
  }

  /**
   * Define query timeout
   */
  public timeout (time: number, options?: { cancel: boolean }): this {
    this.$knexBuilder['timeout'](time, options)
    return this
  }

  /**
   * Use transaction connection
   */
  public useTransaction (trx: TransactionClientContract): this {
    this.$knexBuilder.transacting(trx.knexClient)
    return this
  }

  /**
   * Returns SQL query as a string
   */
  public toQuery (): string {
    return this.$knexBuilder.toQuery()
  }

  /**
   * Executes the query
   */
  public async exec (): Promise<any> {
    this._ensureClient()

    const result = await executeQuery(
      this.$knexBuilder,
      this._getQueryClient(),
      this._client!.profiler,
      this._getProfilerData(),
    )
    return result
  }

  /**
   * Get sql representation of the query
   */
  public toSQL (): knex.Sql {
    return this.$knexBuilder.toSQL()
  }

  /**
   * Implementation of `then` for the promise API
   */
  public then (resolve: any, reject?: any): any {
    return this.exec().then(resolve, reject)
  }

  /**
   * Implementation of `catch` for the promise API
   */
  public catch (reject: any): any {
    return this.exec().catch(reject)
  }

  /**
   * Implementation of `finally` for the promise API
   */
  public finally (fullfilled: any) {
    return this.exec().finally(fullfilled)
  }
}
