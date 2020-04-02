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

import {
  ModelObject,
  ModelAdapterOptions,
  ModelConstructorContract,
  ModelQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Model'

import { DBQueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

import { Preloader } from '../Preloader'
import { executeQuery } from '../../helpers/executeQuery'
import { Chainable } from '../../Database/QueryBuilder/Chainable'
import { SimplePaginator } from '../../Database/Paginator/SimplePaginator'

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
export class ModelQueryBuilder extends Chainable implements ModelQueryBuilderContract<ModelConstructorContract
> {
  /**
   * Sideloaded attributes that will be passed to the model instances
   */
  private sideloaded: ModelObject = {}

  /**
   * A copy of defined preloads on the model instance
   */
  private preloader = new Preloader(this.model)

  /**
   * Required by macroable
   */
  protected static macros = {}
  protected static getters = {}

  /**
   * Control whether or not to wrap adapter result to model
   * instances or not
   */
  protected wrapResultsToModelInstances: boolean = true

  /**
   * Options that must be passed to all new model instances
   */
  public clientOptions: ModelAdapterOptions = {
    client: this.client,
    connection: this.client.connectionName,
    profiler: this.client.profiler,
  }

  constructor (
    builder: knex.QueryBuilder,
    public model: ModelConstructorContract,
    public client: QueryClientContract,
    customFn: DBQueryCallback = (userFn) => {
      return (__builder) => {
        userFn(new ModelQueryBuilder(__builder, this.model, this.client))
      }
    },
  ) {
    super(builder, customFn, model.$keys.attributesToColumns.resolve.bind(model.$keys.attributesToColumns))
    builder.table(model.table)
  }

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
   * Returns the profiler action. Protected, since the class is extended
   * by relationships
   */
  protected getProfilerAction () {
    if (!this.client.profiler) {
      return null
    }

    return this.client.profiler.profile('sql:query', Object.assign(this['toSQL'](), {
      connection: this.client.connectionName,
      inTransaction: this.client.isTransaction,
      model: this.model.name,
    }))
  }

  /**
   * Clone the current query builder
   */
  public clone (): ModelQueryBuilder {
    const clonedQuery = new ModelQueryBuilder(this.knexQuery.clone(), this.model, this.client)
    this.applyQueryFlags(clonedQuery)
    return clonedQuery
  }

  /**
   * Set sideloaded properties to be passed to the model instance
   */
  public sideload (value: ModelObject) {
    this.sideloaded = value
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
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  public async firstOrFail (): Promise<any> {
    const result = await this.limit(1)['exec']()
    if (!result.length) {
      throw new Exception('Row not found', 404, 'E_ROW_NOT_FOUND')
    }

    return result[0]
  }

  /**
   * Define a relationship to be preloaded
   */
  public preload (relationName: any, userCallback?: any): this {
    this.preloader.preload(relationName, userCallback)
    return this
  }

  /**
   * Perform update by incrementing value for a given column. Increments
   * can be clubbed with `update` as well
   */
  public increment (column: any, counter?: any): any {
    this.ensureCanPerformWrites()
    this.knexQuery.increment(column, counter)
    return this
  }

  /**
   * Perform update by decrementing value for a given column. Decrements
   * can be clubbed with `update` as well
   */
  public decrement (column: any, counter?: any): any {
    this.ensureCanPerformWrites()
    this.knexQuery.decrement(column, counter)
    return this
  }

  /**
   * Perform update
   */
  public update (columns: any): any {
    this.ensureCanPerformWrites()
    this.knexQuery.update(columns)
    return this
  }

  /**
   * Delete rows under the current query
   */
  public del (): any {
    this.ensureCanPerformWrites()
    this.knexQuery.del()
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
  public async exec (): Promise<any[]> {
    const isWriteQuery = ['update', 'del', 'insert'].includes(this.knexQuery['_method'])
    const rows = await executeQuery(this.knexQuery, this.client, this.getProfilerAction())

    /**
     * Return the rows as it is when query is a write query
     */
    if (isWriteQuery || this.hasAggregates || !this.wrapResultsToModelInstances) {
      return Array.isArray(rows) ? rows : [rows]
    }

    /**
     * Convert fetch results to an array of model instances
     */
    const modelInstances = this.model.$createMultipleFromAdapterResult(
      rows,
      this.sideloaded,
      this.clientOptions,
    )

    /**
     * Preload for model instances
     */
    await this.preloader.sideload(this.sideloaded).$processAllForMany(modelInstances, this.client)
    return modelInstances
  }

  /**
   * Paginate through rows inside a given table
   */
  public async paginate (page: number, perPage: number = 20) {
    const countQuery = this.clone().clearOrder().clearLimit().clearOffset().clearSelect().count('* as total')
    const aggregateQuery = await countQuery.exec()
    const total = this.hasGroupBy ? aggregateQuery.length : aggregateQuery[0].total

    const results = total > 0 ? await this.forPage(page, perPage).exec() : []
    return new SimplePaginator(results, total, perPage, page)
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
