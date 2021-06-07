/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../../adonis-typings/index.ts" />

import { Knex } from 'knex'

import {
  QueryClientContract,
  RawQueryBuilderContract,
  TransactionClientContract,
} from '@ioc:Adonis/Lucid/Database'
import { QueryRunner } from '../../QueryRunner'

/**
 * Exposes the API to execute raw queries
 */
export class RawQueryBuilder implements RawQueryBuilderContract {
  /**
   * Custom data someone want to send to the profiler and the
   * query event
   */
  private customReporterData: any

  /**
   * Control whether to debug the query or not. The initial
   * value is inherited from the query client
   */
  private debugQueries: boolean = this.client.debug

  constructor(public knexQuery: Knex.Raw, public client: QueryClientContract) {}

  /**
   * Returns the log data
   */
  private getQueryData() {
    return {
      connection: this.client.connectionName,
      inTransaction: this.client.isTransaction,
      ...this.customReporterData,
    }
  }

  /**
   * Define custom reporter data. It will be merged with
   * the existing data
   */
  public reporterData(data: any) {
    this.customReporterData = data
    return this
  }

  /**
   * Wrap the query with before/after strings.
   */
  public wrap(before: string, after: string): this {
    this.knexQuery.wrap(before, after)
    return this
  }

  /**
   * Turn on/off debugging for this query
   */
  public debug(debug: boolean): this {
    this.debugQueries = debug
    return this
  }

  /**
   * Define query timeout
   */
  public timeout(time: number, options?: { cancel: boolean }): this {
    this.knexQuery['timeout'](time, options)
    return this
  }

  /**
   * Returns SQL query as a string
   */
  public toQuery(): string {
    return this.knexQuery.toQuery()
  }

  /**
   * Run query inside the given transaction
   */
  public useTransaction(transaction: TransactionClientContract) {
    this.knexQuery.transacting(transaction.knexClient)
    return this
  }

  /**
   * Executes the query
   */
  public async exec(): Promise<any> {
    return new QueryRunner(this.client, this.debugQueries, this.getQueryData()).run(this.knexQuery)
  }

  /**
   * Get sql representation of the query
   */
  public toSQL(): Knex.Sql {
    return this.knexQuery.toSQL()
  }

  /**
   * Implementation of `then` for the promise API
   */
  public then(resolve: any, reject?: any): any {
    return this.exec().then(resolve, reject)
  }

  /**
   * Implementation of `catch` for the promise API
   */
  public catch(reject: any): any {
    return this.exec().catch(reject)
  }

  /**
   * Implementation of `finally` for the promise API
   */
  public finally(fullfilled: any) {
    return this.exec().finally(fullfilled)
  }

  /**
   * Required when Promises are extended
   */
  public get [Symbol.toStringTag]() {
    return this.constructor.name
  }
}
