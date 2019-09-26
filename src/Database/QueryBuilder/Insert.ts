/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/database.ts" />

import knex from 'knex'
import { trait } from '@poppinss/traits'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { InsertQueryBuilderContract } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

import { Executable, ExecutableConstructor } from '../../Traits/Executable'

/**
 * Exposes the API for performing SQL inserts
 */
@trait<ExecutableConstructor>(Executable)
export class InsertQueryBuilder implements InsertQueryBuilderContract {
  constructor (public $knexBuilder: knex.QueryBuilder, public client: QueryClientContract) {
  }

  /**
   * Returns the client to be used for the query. Even though the insert query
   * is always using the `write` client, we still go through the process of
   * self defining the connection, so that we can discover any bugs during
   * this process.
   */
  public getQueryClient () {
    /**
     * Always use write client for write queries
     */
    return this.client!.getWriteClient().client
  }

  /**
   * Define table for performing the insert query
   */
  public table (table: any): this {
    this.$knexBuilder.table(table)
    return this
  }

  /**
   * Define returning columns for the insert query
   */
  public returning (column: any): any {
    /**
     * Do not chain `returning` in sqlite3 to avoid knex warnings
     */
    if (this.client && this.client.dialect === 'sqlite3') {
      return this
    }

    this.$knexBuilder.returning(column)
    return this
  }

  /**
   * Perform insert query
   */
  public insert (columns: any): this {
    this.$knexBuilder.insert(columns)
    return this
  }

  /**
   * Insert multiple rows in a single query
   */
  public multiInsert (columns: any): this {
    return this.insert(columns)
  }
}
