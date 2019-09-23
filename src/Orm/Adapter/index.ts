/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/orm.ts" />
/// <reference path="../../../adonis-typings/database.ts" />

import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { AdapterContract, ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Orm'

import { ModelQueryBuilder } from '../QueryBuilder'

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
  private _getModelClient (modelConstructor: ModelConstructorContract) {
    return this._db.connection(modelConstructor.$connection)
  }

  /**
   * Returns the model query builder instance for a given model
   */
  public query (modelConstructor: ModelConstructorContract): any {
    const client = this._getModelClient(modelConstructor)
    const query = client.knexQuery()
    query.table(modelConstructor.$table)

    return new ModelQueryBuilder(query, modelConstructor, client)
  }

  /**
   * Find a given row and construct model instance from it
   */
  public async find (
    modelConstructor: ModelConstructorContract,
    key: string,
    value: any,
  ): Promise<ModelContract | null> {
    return this
      .query(modelConstructor)
      .select('*')
      .where(key, value)
      .first()
  }

  /**
   * Returns an array of models by making a select query
   */
  public async findAll (modelConstructor: ModelConstructorContract): Promise<ModelContract[]> {
    return this.query(modelConstructor).select('*').exec()
  }

  /**
   * Perform insert query on a given model instance
   */
  public async insert (instance: ModelContract, attributes: any) {
    const modelConstructor = instance.constructor as unknown as ModelConstructorContract
    const client = this._getModelClient(modelConstructor)
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
    const client = this._getModelClient(modelConstructor)
    const query = instance.$getQueryFor('update', client)

    await query.update(dirty)
  }

  /**
   * Perform delete query on a given model instance
   */
  public async delete (instance: ModelContract) {
    const modelConstructor = instance.constructor as unknown as ModelConstructorContract
    const client = this._getModelClient(modelConstructor)
    const query = instance.$getQueryFor('delete', client)
    await query.del()
  }
}
