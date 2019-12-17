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
import { trait } from '@poppinss/traits'
import { Exception } from '@poppinss/utils'

import {
  ModelObject,
  ModelAdapterOptions,
  ModelConstructorContract,
  ModelQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { DBQueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

import { Preloader } from '../Preloader'
import { Chainable } from '../../Database/QueryBuilder/Chainable'
import { Executable, ExecutableConstructor } from '../../Traits/Executable'

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
@trait<ExecutableConstructor>(Executable)
export class ModelQueryBuilder extends Chainable implements ModelQueryBuilderContract<ModelConstructorContract
> {
  /**
   * A flag to know, if the query being executed is a select query
   * or not, since we don't transform return types of non-select
   * queries
   */
  private _isSelectQuery: boolean = true

  /**
   * Sideloaded attributes that will be passed to the model instances
   */
  private sideloaded: ModelObject = {}

  /**
   * A copy of defined preloads on the model instance
   */
  private _preloader = new Preloader(this.model)

  /**
   * Required by macroable
   */
  protected static _macros = {}
  protected static _getters = {}

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
    super(builder, customFn)
    builder.table(model.$table)
  }

  /**
   * Ensures that we are not executing `update` or `del` when using read only
   * client
   */
  private _ensureCanPerformWrites () {
    if (this.client && this.client.mode === 'read') {
      throw new Exception('Updates and deletes cannot be performed in read mode')
    }
  }

  /**
   * Checks to see that the executed query is update or delete
   */
  public async beforeExecute () {
    if (['update', 'del'].includes(this.$knexBuilder['_method'])) {
      this._isSelectQuery = false
    }
  }

  /**
   * Wraps the query result to model instances. This method is invoked by the
   * Executable trait.
   */
  public async afterExecute (rows: any[]): Promise<any[]> {
    if (!this._isSelectQuery) {
      return Array.isArray(rows) ? rows : [rows]
    }

    const modelInstances = this.model.$createMultipleFromAdapterResult(
      rows,
      this.sideloaded,
      this.clientOptions,
    )

    await this._preloader.sideload(this.sideloaded).processAllForMany(modelInstances, this.client)
    return modelInstances
  }

  /**
   * Set sideloaded properties to be passed to the model instance
   */
  public sideload (value: ModelObject) {
    this.sideloaded = value
    return this
  }

  /**
   * Returns the connection name used by the query client
   */
  public get connection () {
    return this.client!.connectionName
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
    this._preloader.preload(relationName, userCallback)
    return this
  }

  /**
   * Returns the client to be used by the [[Executable]] trait
   * to running the query
   */
  public getQueryClient () {
    /**
     * Use write client for updates and deletes
     */
    if (['update', 'del'].includes(this.$knexBuilder['_method'])) {
      this._ensureCanPerformWrites()
      return this.client!.getWriteClient().client
    }

    return this.client!.getReadClient().client
  }

  /**
   * Returns the profiler action
   */
  public getProfilerAction () {
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
   * Perform update by incrementing value for a given column. Increments
   * can be clubbed with `update` as well
   */
  public increment (column: any, counter?: any): any {
    this._ensureCanPerformWrites()
    this.$knexBuilder.increment(column, counter)
    return this
  }

  /**
   * Perform update by decrementing value for a given column. Decrements
   * can be clubbed with `update` as well
   */
  public decrement (column: any, counter?: any): any {
    this._ensureCanPerformWrites()
    this.$knexBuilder.decrement(column, counter)
    return this
  }

  /**
   * Perform update
   */
  public update (columns: any): any {
    this._ensureCanPerformWrites()
    this.$knexBuilder.update(columns)
    return this
  }

  /**
   * Delete rows under the current query
   */
  public del (): any {
    this._ensureCanPerformWrites()
    this.$knexBuilder.del()
    return this
  }
}
