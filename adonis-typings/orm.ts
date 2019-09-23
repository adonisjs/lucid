/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Orm' {
  import knex from 'knex'
  import { QueryClientContract, ExcutableQueryBuilderContract } from '@ioc:Adonis/Lucid/Database'

  import {
    InsertQueryBuilderContract,
    DatabaseQueryBuilderContract,
  } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

  import {
    BaseModel as DataModelBaseModel,
    AdapterContract as DataModelAdapterContract,
    ModelConstructorContract as DataModelConstructorContract,
    ModelContract as DataModelContract,
    column as baseColumn,
  } from '@poppinss/data-models'

  /**
   * Orm query builder will have extras methods on top of Database query builder
   */
  export interface OrmQueryBuilder<
    Record extends any,
    Result extends any,
  > extends DatabaseQueryBuilderContract<Record, Result>, ExcutableQueryBuilderContract<Result> {
  }

  /**
   * The shape of query adapter
   */
  export interface AdapterContract extends DataModelAdapterContract {
    insert (instance: ModelContract, attributes: any): Promise<void>
    update (instance: ModelContract, dirty: any): Promise<void>
    delete (instance: ModelContract): Promise<void>
    find (model: ModelConstructorContract, key: string, value: any): Promise<ModelContract | null>
    findAll (model: ModelConstructorContract): Promise<ModelContract[]>
  }

  /**
   * Shape of base model
   */
  export interface ModelContract extends DataModelContract {
    /**
     * Gives an option to the end user to define constraints for update, insert
     * and delete queries. Since the query builder for these queries aren't
     * exposed to the end user, this method opens up the API to build
     * custom queries.
     */
    $getQueryFor (
      action: 'insert',
      client: QueryClientContract,
    ): ReturnType<QueryClientContract['insertQuery']>
    $getQueryFor (
      action: 'update' | 'delete',
      client: QueryClientContract,
    ): ReturnType<QueryClientContract['query']>
    $getQueryFor (
      action: 'insert' | 'delete' | 'update',
      client: QueryClientContract,
    ): ReturnType<QueryClientContract['query']> | ReturnType<QueryClientContract['insertQuery']>
  }

  /**
   * Shape of base model static properties
   */
  export interface ModelConstructorContract extends DataModelConstructorContract {
    /**
     * The database connection to use
     */
    $connection?: string

    /**
     * Whether primary key is auto incrementing or not. If not, then
     * end user must provide the value for the primary key
     */
    $increments: boolean

    /**
     * Database table to use
     */
    $table: string

    /**
     * Refs are named value pair of model
     */
    refs: any

    /**
     * Returns the query for fetching a model instance
     */
    query<
      Model extends ModelConstructorContract,
      Instance extends ModelContract,
    > (this: new () => Instance): OrmQueryBuilder<Model, Instance>

    /**
     * Creates model instance from the adapter result
     */
    $createFromAdapterResult<T extends ModelContract> (
      this: new () => T,
      result?: any,
      sideloadAttributes?: string[],
    ): null | T

    /**
     * Creates multiple model instances from the adapter result
     */
    $createMultipleFromAdapterResult<T extends ModelContract> (
      this: new () => T,
      results: any[],
      sideloadAttributes?: string[],
    ): T[]

    /**
     * Fetch row for a key/value pair
     */
    findBy<T extends ModelContract> (
      this: new () => T,
      key: string,
      value: any,
    ): Promise<null | T>

    /**
     * Fetch all rows
     */
    findAll<T extends ModelContract> (this: new () => T): Promise<T[]>

    new (): ModelContract,
  }

  export const BaseModel: ModelConstructorContract
  export const column: typeof baseColumn
}
