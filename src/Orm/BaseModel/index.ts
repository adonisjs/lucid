/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/orm.ts" />

import pluralize from 'pluralize'
import snakeCase from 'snake-case'
import { BaseModel as BaseDataModel, StaticImplements } from '@poppinss/data-models'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Orm'

@StaticImplements<ModelConstructorContract>()
export abstract class BaseModel extends BaseDataModel implements ModelContract {
  /**
   * Whether or not to rely on database to return the primaryKey
   * value. If this is set to false, then the user must provide
   * the `$primaryKeyValue` themselves.
   */
  public static $increments: boolean

  /**
   * The name of database table. It is auto generated from the model name, unless
   * specified
   */
  public static $table: string

  /**
   * Refs are helpful of autocompleting the model props
   */
  public static refs: any

  /**
   * A custom connection to use for queries
   */
  public static $connection?: string

  public static query (): any {
  }

  /**
   * Boot the model
   */
  public static $boot () {
    super.$boot()
    this.$increments = this.$increments === undefined ? true : this.$increments
    this.$table = this.$table === undefined ? pluralize(snakeCase(this.name)) : this.$table
  }

  /**
   * Returns the query for `insert`, `update` or `delete` actions.
   * Since the query builder for these actions are not exposed to
   * the end user, this method gives a way to compose queries.
   */
  public $getQueryFor (
    action: 'insert' | 'update' | 'delete',
    client: QueryClientContract,
  ): any {
    const modelConstructor = this.constructor as typeof BaseModel

    /**
     * Returning insert query for the inserts
     */
    if (action === 'insert') {
      const insertQuery = client.insertQuery().table(modelConstructor.$table)

      if (modelConstructor.$increments) {
        insertQuery.returning(modelConstructor.$primaryKey)
      }
      return insertQuery
    }

    /**
     * Returning generic query builder for rest of the queries
     */
    return client
      .query()
      .from(modelConstructor.$table)
      .where(modelConstructor.$primaryKey, this.$primaryKeyValue)
  }
}
