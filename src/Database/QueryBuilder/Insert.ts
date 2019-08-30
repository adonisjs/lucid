/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/database.ts" />

import * as knex from 'knex'
import { Exception } from '@poppinss/utils'

import {
  InsertQueryBuilderContract,
  TransactionClientContract,
  QueryClientContract,
} from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

import { executeQuery, isInTransaction } from '../../utils'

/**
 * Exposes the API for performing SQL inserts
 */
export class InsertQueryBuilder implements InsertQueryBuilderContract {
  constructor (protected $knexBuilder: knex.QueryBuilder, private _client?: QueryClientContract) {
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
   * Returns the client to be used for the query. Even though the insert query
   * is always using the `write` client, we still go through the process of
   * self defining the connection, so that we can discover any bugs during
   * this process.
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
     * Always use write client for write queries
     */
    return this._client!.getWriteClient().client
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
   * Define table for performing the insert query
   */
  public table (table: any): this {
    this.$knexBuilder.table(table)
    return this
  }

  /**
   * Define returning columns for the insert query
   */
  public returning (column: any): any {
    /**
     * Do not chain `returning` in sqlite3 to avoid knex warnings
     */
    if (this._client && this._client.dialect === 'sqlite3') {
      return this
    }

    this.$knexBuilder.returning(column)
    return this
  }

  /**
   * Perform insert query
   */
  public insert (columns: any): this {
    this.$knexBuilder.insert(columns)
    return this
  }

  /**
   * Insert multiple rows in a single query
   */
  public multiInsert (columns: any): this {
    return this.insert(columns)
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
