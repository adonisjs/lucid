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
  RawContract,
  TransactionClientContract,
  QueryClientContract,
} from '@ioc:Adonis/Addons/DatabaseQueryBuilder'
import { executeQuery } from '../../utils'

/**
 * Exposes the API to execute raw queries
 */
export class RawQueryBuilder implements RawContract {
  constructor (protected $knexBuilder: knex.Raw, private _client?: QueryClientContract) {
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
   * Wrap the query with before/after strings.
   */
  public wrap (before: string, after: string): this {
    this.$knexBuilder.wrap(before, after)
    return this
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
      undefined,
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
