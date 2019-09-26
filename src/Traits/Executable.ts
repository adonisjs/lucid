/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import knex from 'knex'
import { Exception } from '@poppinss/utils'
import { ProfilerActionContract } from '@ioc:Adonis/Core/Profiler'

import {
  QueryClientContract,
  TransactionClientContract,
  ExcutableQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Database'

/**
 * Enforcing constructor on the destination class
 */
export type ExecutableConstructor<T = {
  $knexBuilder: knex.Raw | knex.QueryBuilder,
  getQueryClient: () => undefined | knex,
  client: QueryClientContract,
  beforeExecute?: () => Promise<void>,
  afterExecute?: (results: any[]) => Promise<any[]>,
}> = { new (...args: any[]): T }

/**
 * To be used as a trait for executing a query that has a public
 * `$knexBuilder`
 */
export class Executable implements ExcutableQueryBuilderContract<any> {
  protected $knexBuilder: knex.QueryBuilder | knex.Raw
  protected client: QueryClientContract
  protected getQueryClient: () => undefined | knex
  protected beforeExecute?: () => Promise<void>
  protected afterExecute?: (results: any[]) => Promise<any[]>

  /**
   * Returns the profiler action
   */
  private _getProfilerAction () {
    if (!this.client.profiler) {
      return null
    }

    return this.client.profiler.profile('sql:query', Object.assign(this.toSQL(), {
      connection: this.client.connectionName,
    }))
  }

  /**
   * Ends the profile action
   */
  private _endProfilerAction (action: null | ProfilerActionContract, error?: any) {
    if (!action) {
      return
    }

    error ? action.end({ error }) : action.end()
  }

  /**
   * Executes the knex query builder
   */
  private async _executeQuery () {
    const action = this._getProfilerAction()
    try {
      const result = await this.$knexBuilder
      this._endProfilerAction(action)
      return result
    } catch (error) {
      this._endProfilerAction(action, error)
      throw error
    }
  }

  /**
   * Executes the query by acquiring a connection from a custom
   * knex client
   */
  private async _executeQueryWithCustomConnection (knexClient: knex) {
    const action = this._getProfilerAction()

    /**
     * Acquire connection from the client and set it as the
     * connection to be used for executing the query
     */
    const connection = await knexClient['acquireConnection']()
    this.$knexBuilder.connection(connection)

    let queryError: any = null
    let queryResult: any = null

    /**
     * Executing the query and catching exceptions so that we can
     * dispose the connection before raising exception from this
     * method
     */
    try {
      queryResult = await this.$knexBuilder
      this._endProfilerAction(action)
    } catch (error) {
      queryError = error
      this._endProfilerAction(action, error)
    }

    /**
     * Releasing the connection back to pool
     */
    knexClient['releaseConnection'](connection)

    /**
     * Re-throw if there was an exception
     */
    if (queryError) {
      throw queryError
    }

    /**
     * Return result
     */
    return queryResult
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
   * Returns SQL query as a string
   */
  public toQuery (): string {
    return this.$knexBuilder.toQuery()
  }

  /**
   * Run query inside the given transaction
   */
  public useTransaction (transaction: TransactionClientContract) {
    this.$knexBuilder.transacting(transaction.knexClient)
    return this
  }

  /**
   * Executes the query
   */
  public async exec (): Promise<any> {
    let result: any

    /**
     * Raise exception when client is missing, since we need one to execute
     * the query
     */
    if (!this.client) {
      throw new Exception('Cannot execute query without query client', 500, 'E_RUNTIME_EXCEPTION')
    }

    /**
     * Execute before handler if exists
     */
    if (typeof (this.beforeExecute) === 'function') {
      await this.beforeExecute()
    }

    /**
     * Execute the query as it is when using `sqlite3` or query builder is part of a
     * transaction
     */
    if (
      this.client.dialect === 'sqlite3'
      || this.client.isTransaction
      || this.$knexBuilder['client'].transacting
    ) {
      result = await this._executeQuery()
    } else {
      const knexClient = this.getQueryClient()
      if (knexClient) {
        result = await this._executeQueryWithCustomConnection(knexClient)
      } else {
        result = await this._executeQuery()
      }
    }

    /**
     * Execute after handler if exists
     */
    if (typeof (this.afterExecute) === 'function') {
      result = await this.afterExecute(result)
    }

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

  /**
   * Required when Promises are extended
   */
  public get [Symbol.toStringTag] () {
    return this.constructor.name
  }
}
