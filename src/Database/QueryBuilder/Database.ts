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
import { Exception } from '@poppinss/utils'

import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import { DatabaseQueryBuilderContract, DBQueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

import { Chainable } from './Chainable'
import { executeQuery } from '../../helpers/executeQuery'

/**
 * Wrapping the user function for a query callback and give them
 * a new instance of the `DatabaseQueryBuilder` and not
 * knex.QueryBuilder
 */
const queryCallback: DBQueryCallback = (userFn, keysResolver) => {
  return (builder: knex.QueryBuilder) => {
    /**
     * Sub queries don't need the client, since client is used to execute the query
     * and subqueries are not executed seperately. That's why we just pass
     * an empty object.
     *
     * Other option is to have this method for each instance of the class, but this
     * is waste of resources.
     */
    userFn(new DatabaseQueryBuilder(builder, {} as any, keysResolver))
  }
}

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
export class DatabaseQueryBuilder extends Chainable implements DatabaseQueryBuilderContract {
  constructor (
    builder: knex.QueryBuilder,
    public client: QueryClientContract,
    public keysResolver?: (columnName: string) => string,
  ) {
    super(builder, queryCallback, keysResolver)
  }

  /**
   * Required by macroable
   */
  protected static macros = {}
  protected static getters = {}

  /**
   * Ensures that we are not executing `update` or `del` when using read only
   * client
   */
  private ensureCanPerformWrites () {
    if (this.client && this.client.mode === 'read') {
      throw new Exception('Updates and deletes cannot be performed in read mode')
    }
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
   * Delete rows under the current query
   */
  public del (): this {
    this.ensureCanPerformWrites()
    this.knexQuery.del()
    return this
  }

  /**
   * Clone the current query builder
   */
  public clone (): DatabaseQueryBuilder {
    return new DatabaseQueryBuilder(this.knexQuery.clone(), this.client)
  }

  /**
   * Define returning columns
   */
  public returning (columns: any): this {
    /**
     * Do not chain `returning` in sqlite3 to avoid knex warnings
     */
    if (this.client && ['sqlite3', 'mysql'].includes(this.client.dialect.name)) {
      return this
    }

    columns = Array.isArray(columns)
      ? columns.map((column) => this.resolveKey(column))
      : this.resolveKey(columns)

    this.knexQuery.returning(columns)
    return this
  }

  /**
   * Perform update by incrementing value for a given column. Increments
   * can be clubbed with `update` as well
   */
  public increment (column: any, counter?: any): this {
    this.knexQuery.increment(this.resolveKey(column, true), counter)
    return this
  }

  /**
   * Perform update by decrementing value for a given column. Decrements
   * can be clubbed with `update` as well
   */
  public decrement (column: any, counter?: any): this {
    this.knexQuery.decrement(this.resolveKey(column, true), counter)
    return this
  }

  /**
   * Perform update
   */
  public update (column: any, value?: any, returning?: string[]): this {
    this.ensureCanPerformWrites()
    if (!value && !returning) {
      this.knexQuery.update(this.resolveKey(column, true))
    } else if (!returning) {
      this.knexQuery.update(this.resolveKey(column, true), value)
    } else {
      this.knexQuery.update(this.resolveKey(column), value, returning)
    }

    return this
  }

  /**
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  public async first (): Promise<any> {
    const result = await this.limit(1)['exec']()
    return result[0] || null
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
