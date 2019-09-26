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
  RelationContract,
  ModelConstructorContract,
  ModelQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { Chainable } from '../../Database/QueryBuilder/Chainable'
import { Executable, ExecutableConstructor } from '../../Traits/Executable'

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
@trait<ExecutableConstructor>(Executable)
export class ModelQueryBuilder extends Chainable implements ModelQueryBuilderContract<
  ModelConstructorContract
> {
  /**
   * Sideloaded attributes that will be passed to the model instances
   */
  private _sideloaded = {}

  /**
   * A copy of defined preloads on the model instance
   */
  private _preloads: {
    relation: RelationContract,
    callback?: (builder: ModelQueryBuilderContract<any>) => void,
  }[] = []

  constructor (
    builder: knex.QueryBuilder,
    public model: ModelConstructorContract,
    public client: QueryClientContract,
    public options?: ModelOptions,
  ) {
    super(builder, (userFn) => {
      return (builder) => {
        userFn(new ModelQueryBuilder(builder, this.model, this.client, this.options))
      }
    })
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
      this.options,
    )

    await Promise.all(this._preloads.map((one) => {
      return one.relation.exec(modelInstances, this.options, one.callback)
    }))
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
   * Define a relationship to be preloaded
   */
  public preload (
    relationName: string,
    callback?: (builder: ModelQueryBuilderContract<any>) => void,
  ): this {
    const relation = this.model.$getRelation(relationName)

    /**
     * Undefined relationship
     */
    if (!relation) {
      throw new Exception(`${relationName} is not defined as a relationship on ${this.model.name} model`)
    }

    this._preloads.push({ relation, callback })
    return this
  }

  /**
   * Returns the client to be used by the [[Executable]] trait
   * to running the query
   */
  public getQueryClient () {
    return this.client!.getReadClient().client
  }
}
