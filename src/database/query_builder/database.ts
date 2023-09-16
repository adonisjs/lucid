/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { Exception } from '@poppinss/utils'
import {
  DialectContract,
  QueryClientContract,
  TransactionClientContract,
} from '../../../adonis-typings/database.js'
import {
  DBQueryCallback,
  DatabaseQueryBuilderContract,
} from '../../../adonis-typings/querybuilder.js'

import { Chainable } from './chainable.js'
import { QueryRunner } from '../../query_runner/index.js'
import { SimplePaginator } from '../paginator/simple_paginator.js'

/**
 * Wrapping the user function for a query callback and give them
 * a new instance of the `DatabaseQueryBuilder` and not
 * knex.QueryBuilder
 */
const queryCallback: DBQueryCallback = (userFn, keysResolver) => {
  return (builder: Knex.QueryBuilder) => {
    /**
     * Sub queries don't need the client, since client is used to execute the query
     * and subqueries are not executed seperately. That's why we just pass
     * an empty object.
     *
     * Other option is to have this method for each instance of the class, but this
     * is waste of resources.
     */
    const query = new DatabaseQueryBuilder(builder, {} as any, keysResolver)
    userFn(query)
    query['applyWhere']()
  }
}

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
export class DatabaseQueryBuilder extends Chainable implements DatabaseQueryBuilderContract {
  /**
   * Custom data someone want to send to the profiler and the
   * query event
   */
  private customReporterData: any

  /**
   * Control whether to debug the query or not. The initial
   * value is inherited from the query client
   */
  private debugQueries: boolean

  /**
   * Required by macroable
   */
  protected static macros = {}
  protected static getters = {}

  constructor(
    builder: Knex.QueryBuilder,
    public client: QueryClientContract,
    public keysResolver?: (columnName: string) => string
  ) {
    super(builder, queryCallback, keysResolver)
    this.debugQueries = this.client.debug
  }

  /**
   * Ensures that we are not executing `update` or `del` when using read only
   * client
   */
  private ensureCanPerformWrites() {
    if (this.client && this.client.mode === 'read') {
      throw new Exception('Updates and deletes cannot be performed in read mode')
    }
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
   * Define custom reporter data. It will be merged with
   * the existing data
   */
  reporterData(data: any) {
    this.customReporterData = data
    return this
  }

  /**
   * Delete rows under the current query
   */
  del(returning?: string | string[]): this {
    this.ensureCanPerformWrites()
    returning ? this.knexQuery.del(returning) : this.knexQuery.del()
    return this
  }

  /**
   * Alias for [[del]]
   */
  delete(returning?: string | string[]): this {
    return this.del(returning)
  }

  /**
   * Clone the current query builder
   */
  clone(): DatabaseQueryBuilder {
    const clonedQuery = new DatabaseQueryBuilder(this.knexQuery.clone(), this.client)
    this.applyQueryFlags(clonedQuery)
    clonedQuery.debug(this.debugQueries)
    this.customReporterData && clonedQuery.reporterData(this.customReporterData)
    return clonedQuery
  }

  /**
   * Define returning columns
   */
  returning(columns: any): this {
    if (this.client.dialect.supportsReturningStatement) {
      columns = Array.isArray(columns)
        ? columns.map((column) => this.resolveKey(column))
        : this.resolveKey(columns)

      this.knexQuery.returning(columns)
    }

    return this
  }

  /**
   * Perform update by incrementing value for a given column. Increments
   * can be clubbed with `update` as well
   */
  increment(column: any, counter?: any): this {
    this.ensureCanPerformWrites()
    this.knexQuery.increment(this.resolveKey(column, true), counter)
    return this
  }

  /**
   * Perform update by decrementing value for a given column. Decrements
   * can be clubbed with `update` as well
   */
  decrement(column: any, counter?: any): this {
    this.ensureCanPerformWrites()
    this.knexQuery.decrement(this.resolveKey(column, true), counter)
    return this
  }

  /**
   * Perform update
   */
  update(column: any, value?: any, returning?: string | string[]): this {
    this.ensureCanPerformWrites()

    if (value === undefined && returning === undefined) {
      this.knexQuery.update(this.resolveKey(column, true))
    } else if (returning === undefined) {
      this.knexQuery.update(this.resolveKey(column), value)
    } else {
      this.knexQuery.update(this.resolveKey(column), value, returning)
    }

    return this
  }

  /**
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  async first(): Promise<any> {
    const result = await this.limit(1)['exec']()
    return result[0] || null
  }

  /**
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  async firstOrFail(): Promise<any> {
    const row = await this.first()
    if (!row) {
      throw new Exception('Row not found', { status: 404, code: 'E_ROW_NOT_FOUND' })
    }

    return row
  }

  /**
   * Define a query to constraint to be defined when condition is truthy
   */
  ifDialect(
    dialects: DialectContract['name'] | DialectContract['name'][],
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this {
    dialects = Array.isArray(dialects) ? dialects : [dialects]

    if (dialects.includes(this.client.dialect.name)) {
      matchCallback(this)
    } else if (noMatchCallback) {
      noMatchCallback(this)
    }

    return this
  }

  /**
   * Define a query to constraint to be defined when condition is falsy
   */
  unlessDialect(
    dialects: DialectContract['name'] | DialectContract['name'][],
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this {
    dialects = Array.isArray(dialects) ? dialects : [dialects]

    if (!dialects.includes(this.client.dialect.name)) {
      matchCallback(this)
    } else if (noMatchCallback) {
      noMatchCallback(this)
    }

    return this
  }

  /**
   * Turn on/off debugging for this query
   */
  debug(debug: boolean): this {
    this.debugQueries = debug
    return this
  }

  /**
   * Define query timeout
   */
  timeout(time: number, options?: { cancel: boolean }): this {
    this.knexQuery['timeout'](time, options)
    return this
  }

  /**
   * Returns SQL query as a string
   */
  toQuery(): string {
    this.applyWhere()
    return this.knexQuery.toQuery()
  }

  /**
   * Run query inside the given transaction
   */
  useTransaction(transaction: TransactionClientContract): this {
    this.knexQuery.transacting(transaction.knexClient)
    return this
  }

  /**
   * Executes the query
   */
  async exec(): Promise<any> {
    this.applyWhere()
    return new QueryRunner(this.client, this.debugQueries, this.getQueryData()).run(this.knexQuery)
  }

  /**
   * Paginate through rows inside a given table
   */
  async paginate(page: number, perPage: number = 20) {
    /**
     * Cast to number
     */
    page = Number(page)
    perPage = Number(perPage)

    const countQuery = this.client
      .query()
      .from(this.clone().clearOrder().clearLimit().clearOffset().as('subQuery'))
      .count('* as total')

    const aggregates = await countQuery.exec()

    const total = aggregates[0].total
    const results = total > 0 ? await this.forPage(page, perPage).exec() : []

    return new SimplePaginator(total, perPage, page, ...results)
  }

  /**
   * Get sql representation of the query
   */
  toSQL(): Knex.Sql {
    this.applyWhere()
    return this.knexQuery.toSQL()
  }

  /**
   * Implementation of `then` for the promise API
   */
  then(resolve: any, reject?: any): any {
    return this.exec().then(resolve, reject)
  }

  /**
   * Implementation of `catch` for the promise API
   */
  catch(reject: any): any {
    return this.exec().catch(reject)
  }

  /**
   * Implementation of `finally` for the promise API
   */
  finally(fullfilled: any) {
    return this.exec().finally(fullfilled)
  }

  /**
   * Required when Promises are extended
   */
  get [Symbol.toStringTag]() {
    return this.constructor.name
  }
}
