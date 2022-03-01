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
import { Macroable } from 'macroable'

import {
  QueryClientContract,
  TransactionClientContract,
  InsertQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Database'

import { RawQueryBuilder } from './Raw'
import { QueryRunner } from '../../QueryRunner'
import { RawBuilder } from '../StaticBuilder/Raw'
import { ReferenceBuilder } from '../StaticBuilder/Reference'

/**
 * Exposes the API for performing SQL inserts
 */
export class InsertQueryBuilder extends Macroable implements InsertQueryBuilderContract {
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

  /**
   * Required by macroable
   */
  protected static macros = {}
  protected static getters = {}

  constructor(public knexQuery: Knex.QueryBuilder, public client: QueryClientContract) {
    super()
  }

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
   * Transforms the value to something that knex can internally understand and
   * handle. It includes.
   *
   * 1. Returning the `knexBuilder` for sub queries.
   * 2. Returning the `knexBuilder` for raw queries.
   */
  protected transformValue(value: any) {
    if (value instanceof ReferenceBuilder) {
      return value.toKnex(this.knexQuery.client)
    }

    return this.transformRaw(value)
  }

  /**
   * Returns the underlying knex raw query builder for Lucid raw
   * query builder
   */
  protected transformRaw(value: any) {
    if (value instanceof RawQueryBuilder) {
      return value['knexQuery']
    }

    if (value instanceof RawBuilder) {
      return value.toKnex(this.knexQuery.client)
    }

    return value
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
   * Define table for performing the insert query
   */
  public table(table: any): this {
    this.knexQuery.table(table)
    return this
  }

  /**
   * Define schema for the table
   */
  public withSchema(schema: any): this {
    this.knexQuery.withSchema(schema)
    return this
  }

  /**
   * Define returning columns for the insert query
   */
  public returning(column: any): any {
    this.knexQuery.returning(column)
    return this
  }

  /**
   * Perform insert query
   */
  public insert(columns: any): this {
    if (columns && Array.isArray(columns)) {
      columns = columns.map((column) => {
        return column && typeof column === 'object'
          ? Object.keys(column).reduce((result, key) => {
              result[key] = this.transformValue(column[key])
              return result
            }, {})
          : column
      })
    } else if (columns && typeof columns === 'object') {
      columns = Object.keys(columns).reduce((result, key) => {
        result[key] = this.transformValue(columns[key])
        return result
      }, {})
    }

    this.knexQuery.insert(columns)
    return this
  }

  /**
   * Insert multiple rows in a single query
   */
  public multiInsert(columns: any): this {
    return this.insert(columns)
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
