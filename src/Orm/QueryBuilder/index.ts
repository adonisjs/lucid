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
  ModelOptions,
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
   * Sideloaded attributes that will be passed to the model instances
   */
  private _sideloaded = {}

  /**
   * A copy of defined preloads on the model instance
   */
  private _preloader = new Preloader(this.model)

  /**
   * Options that must be passed to all new model instances
   */
  public clientOptions: ModelOptions = {
    connection: this.client.connectionName,
    profiler: this.client.profiler,
  }

  constructor (
    builder: knex.QueryBuilder,
    public model: ModelConstructorContract,
    public client: QueryClientContract,
    customFn: DBQueryCallback = (userFn) => {
      return (builder) => {
        userFn(new ModelQueryBuilder(builder, this.model, this.client))
      }
    },
  ) {
    super(builder, customFn)
    builder.table(model.$table)
  }

  /**
   * Wraps the query result to model instances. This method is invoked by the
   * Executable trait.
   */
  public async afterExecute (rows: any[]): Promise<any[]> {
    const modelInstances = this.model.$createMultipleFromAdapterResult(
      rows,
      this._sideloaded,
      this.clientOptions,
    )

    await this._preloader.processAllForMany(modelInstances, this.client)
    return modelInstances
  }

  /**
   * Set sideloaded properties to be passed to the model instance
   */
  public sideload (value: any) {
    this._sideloaded = value
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
  public preload (relationName: string, userCallback?: any): this {
    this._preloader.preload(relationName, userCallback)
    return this
  }

  /**
   * Returns the client to be used by the [[Executable]] trait
   * to running the query
   */
  public getQueryClient () {
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
}
