/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/database.ts" />
/// <reference path="../../../adonis-typings/orm.ts" />

import knex from 'knex'
import { trait } from '@poppinss/traits'

import {
  ModelOptions,
  ModelConstructorContract,
  ModelQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Orm'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { Chainable } from '../../Database/QueryBuilder/Chainable'
import { Executable, ExecutableConstructor } from '../../Database/Traits/Executable'

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

  constructor (
    builder: knex.QueryBuilder,
    public model: ModelConstructorContract,
    public options?: ModelOptions,
    public client?: QueryClientContract,
  ) {
    super(builder, (userFn) => {
      return (builder) => {
        userFn(new ModelQueryBuilder(builder, this.model))
      }
    })
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
   * Wraps the query result to model instances. This method is invoked by the
   * Executable trait.
   */
  public wrapQueryResults (rows: any[]): any[] {
    return this.model!.$createMultipleFromAdapterResult(rows, this._sideloaded, this.options)
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
   * Returns the client to be used by the [[Executable]] trait
   * to running the query
   */
  public getQueryClient () {
    return this.client!.getReadClient().client
  }
}
