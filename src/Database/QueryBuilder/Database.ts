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

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { DatabaseQueryBuilderContract, QueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

import { Chainable } from './Chainable'
import { Executable, ExecutableConstructor } from '../../Traits/Executable'

/**
 * Wrapping the user function for a query callback and give them
 * a new instance of the `DatabaseQueryBuilder` and not
 * knex.QueryBuilder
 */
function queryCallback (userFn: QueryCallback<DatabaseQueryBuilderContract>) {
  return (builder: knex.QueryBuilder) => {
    /**
     * Sub queries don't need the client, since client is used to execute the query
     * and subqueries are not executed seperately. That's why we just pass
     * an empty object.
     *
     * Other option is to have this method for each instance of the class, but this
     * is waste of resources.
     */
    userFn(new DatabaseQueryBuilder(builder, {} as any))
  }
}

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
@trait<ExecutableConstructor>(Executable)
export class DatabaseQueryBuilder extends Chainable implements DatabaseQueryBuilderContract {
  constructor (builder: knex.QueryBuilder, public client: QueryClientContract) {
    super(builder, queryCallback)
  }

  /**
   * Required by macroable
   */
  protected static _macros = {}
  protected static _getters = {}

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
   * Delete rows under the current query
   */
  public del (): this {
    this._ensureCanPerformWrites()
    this.$knexBuilder.del()
    return this
  }

  /**
   * Clone the current query builder
   */
  public clone (): DatabaseQueryBuilder {
    return new DatabaseQueryBuilder(this.$knexBuilder.clone(), this.client)
  }

  /**
   * Define returning columns
   */
  public returning (columns: any): this {
    /**
     * Do not chain `returning` in sqlite3 to avoid knex warnings
     */
    if (this.client && ['sqlite3', 'mysql'].includes(this.client.dialect.name)) {
      return this
    }

    this.$knexBuilder.returning(columns)
    return this
  }

  /**
   * Perform update by incrementing value for a given column. Increments
   * can be clubbed with `update` as well
   */
  public increment (column: any, counter?: any): this {
    this.$knexBuilder.increment(column, counter)
    return this
  }

  /**
   * Perform update by decrementing value for a given column. Decrements
   * can be clubbed with `update` as well
   */
  public decrement (column: any, counter?: any): this {
    this.$knexBuilder.decrement(column, counter)
    return this
  }

  /**
   * Perform update
   */
  public update (columns: any): this {
    this._ensureCanPerformWrites()
    this.$knexBuilder.update(columns)
    return this
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
   * Returns the client to be used for the query. This method relies on the
   * query method and will choose the read or write connection whenever
   * required.
   *
   * This method is invoked by the `Executable` Trait, only when actually
   * query isn't using the transaction
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
    }))
  }
}
