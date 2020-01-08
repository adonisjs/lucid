/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import knex from 'knex'

import { RawContract } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import { executeQuery } from '../../helpers/executeQuery'

/**
 * Exposes the API to execute raw queries
 */
export class RawQueryBuilder implements RawContract {
  constructor (public knexQuery: knex.Raw, public client: QueryClientContract) {
  }

  /**
   * Returns the profiler action
   */
  private getProfilerAction () {
    if (!this.client.profiler) {
      return null
    }

    return this.client.profiler.profile('sql:query', Object.assign(this['toSQL'](), {
      connection: this.client.connectionName,
      inTransaction: this.client.isTransaction,
    }))
  }

  /**
   * Wrap the query with before/after strings.
   */
  public wrap (before: string, after: string): this {
    this.knexQuery.wrap(before, after)
    return this
  }

  /**
   * Turn on/off debugging for this query
   */
  public debug (debug: boolean): this {
    this.knexQuery.debug(debug)
    return this
  }

  /**
   * Define query timeout
   */
  public timeout (time: number, options?: { cancel: boolean }): this {
    this.knexQuery['timeout'](time, options)
    return this
  }

  /**
   * Returns SQL query as a string
   */
  public toQuery (): string {
    return this.knexQuery.toQuery()
  }

  /**
   * Run query inside the given transaction
   */
  public useTransaction (transaction: TransactionClientContract) {
    this.knexQuery.transacting(transaction.knexClient)
    return this
  }

  /**
   * Executes the query
   */
  public async exec (): Promise<any> {
    return executeQuery(this.knexQuery, this.client, this.getProfilerAction())
  }

  /**
   * Get sql representation of the query
   */
  public toSQL (): knex.Sql {
    return this.knexQuery.toSQL()
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

  /**
   * Required when Promises are extended
   */
  public get [Symbol.toStringTag] () {
    return this.constructor.name
  }
}
