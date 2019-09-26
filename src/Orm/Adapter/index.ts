/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import {
  ModelOptions,
  ModelContract,
  AdapterContract,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

/**
 * Adapter exposes the API to make database queries and constructor
 * model instances from it.
 */
export class Adapter implements AdapterContract {
  constructor (private _db: DatabaseContract) {
  }

  /**
   * Returns the query client based upon the model instance
   */
  private _getModelClient (modelConstructor: ModelConstructorContract, options?: ModelOptions) {
    const connection = options && options.connection || modelConstructor.$connection
    const profiler = options && options.profiler
    return this._db.connection(connection, { profiler })
  }

  /**
   * Returns the model query builder instance for a given model
   */
  public query (modelConstructor: ModelConstructorContract, options?: ModelOptions): any {
    const client = this._getModelClient(modelConstructor, options)
    return client.modelQuery(modelConstructor)
  }

  /**
   * Perform insert query on a given model instance
   */
  public async insert (instance: ModelContract, attributes: any) {
    const modelConstructor = instance.constructor as unknown as ModelConstructorContract
    const client = this._getModelClient(modelConstructor, instance.$options)
    const query = instance.$getQueryFor('insert', client)

    const result = await query.insert(attributes)
    if (modelConstructor.$increments) {
      instance.$consumeAdapterResult({ [modelConstructor.$primaryKey]: result[0] })
    }
  }

  /**
   * Perform update query on a given model instance
   */
  public async update (instance: ModelContract, dirty: any) {
    const modelConstructor = instance.constructor as unknown as ModelConstructorContract
    const client = this._getModelClient(modelConstructor, instance.$options)
    const query = instance.$getQueryFor('update', client)

    await query.update(dirty)
  }

  /**
   * Perform delete query on a given model instance
   */
  public async delete (instance: ModelContract) {
    const modelConstructor = instance.constructor as unknown as ModelConstructorContract
    const client = this._getModelClient(modelConstructor, instance.$options)
    const query = instance.$getQueryFor('delete', client)
    await query.del()
  }
}
