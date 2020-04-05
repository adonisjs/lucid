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
  LucidRow,
  LucidModel,
  AdapterContract,
  ModelAdapterOptions,
} from '@ioc:Adonis/Lucid/Model'

/**
 * Adapter exposes the API to make database queries and constructor
 * model instances from it.
 */
export class Adapter implements AdapterContract {
  constructor (private db: DatabaseContract) {
  }

  /**
   * Returns the query client based upon the model instance
   */
  public modelConstructorClient (modelConstructor: LucidModel, options?: ModelAdapterOptions) {
    if (options && options.client) {
      return options.client
    }

    const connection = options && options.connection || modelConstructor.connection
    const profiler = options && options.profiler
    return this.db.connection(connection, { profiler })
  }

  /**
   * Returns the model query builder instance for a given model
   */
  public query (modelConstructor: LucidModel, options?: ModelAdapterOptions): any {
    const client = this.modelConstructorClient(modelConstructor, options)
    return client.modelQuery(modelConstructor)
  }

  /**
   * Returns query client for a model instance by inspecting it's options
   */
  public modelClient (instance: LucidRow): any {
    const modelConstructor = instance.constructor as unknown as LucidModel
    return instance.$trx ? instance.$trx : this.modelConstructorClient(modelConstructor, instance.$options)
  }

  /**
   * Perform insert query on a given model instance
   */
  public async insert (instance: LucidRow, attributes: any) {
    const modelConstructor = instance.constructor as unknown as LucidModel
    const query = instance.$getQueryFor('insert', this.modelClient(instance))

    const primaryKeyColumnName = modelConstructor.$keys.attributesToColumns.get(
      modelConstructor.primaryKey,
      modelConstructor.primaryKey,
    )

    const result = await query.insert(attributes)
    instance.$consumeAdapterResult({ [primaryKeyColumnName]: result[0] })
  }

  /**
   * Perform update query on a given model instance
   */
  public async update (instance: LucidRow, dirty: any) {
    await instance.$getQueryFor('update', this.modelClient(instance)).update(dirty)
  }

  /**
   * Perform delete query on a given model instance
   */
  public async delete (instance: LucidRow) {
    await instance.$getQueryFor('delete', this.modelClient(instance)).del()
  }
}
