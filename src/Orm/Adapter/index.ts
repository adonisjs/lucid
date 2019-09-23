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

/**
 * Adapter exposes the API to make database queries and constructor
 * model instances from it.
 */
export class Adapter implements AdapterContract {
  constructor (private _db: DatabaseContract) {
  }

  /**
   * Find a given row and construct model instance from it
   */
  public async find (
    modelConstructor: ModelConstructorContract,
    key: string,
    value: any,
  ): Promise<ModelContract | null> {
    const client = this._db.connection(modelConstructor.$connection)

    const result = await client
      .query()
      .select('*')
      .from(modelConstructor.$table)
      .where(key, value)
      .limit(1)

    return modelConstructor.$createFromAdapterResult(result[0])
  }

  /**
   * Returns an array of models by making a select query
   */
  public async findAll (modelConstructor: ModelConstructorContract): Promise<ModelContract[]> {
    const client = this._db.connection(modelConstructor.$connection)

    const results = await client.query().select('*').from(modelConstructor.$table)
    return modelConstructor.$createMultipleFromAdapterResult(results)
  }

  /**
   * Perform insert query on a given model instance
   */
  public async insert (instance: ModelContract, attributes: any) {
    const modelConstructor = instance.constructor as unknown as ModelConstructorContract
    const client = this._db.connection(modelConstructor.$connection)
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
    const client = this._db.connection(modelConstructor.$connection)
    const query = instance.$getQueryFor('update', client)

    await query.update(dirty)
  }

  /**
   * Perform delete query on a given model instance
   */
  public async delete (instance: ModelContract) {
    const modelConstructor = instance.constructor as unknown as ModelConstructorContract
    const client = this._db.connection(modelConstructor.$connection)
    const query = instance.$getQueryFor('delete', client)
    await query.del()
  }
}
