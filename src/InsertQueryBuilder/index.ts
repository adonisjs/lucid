/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/database.ts" />

import * as knex from 'knex'
import { InsertQueryBuilderContract } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

/**
 * Exposes the API for performing SQL inserts
 */
export class InsertQueryBuilder implements InsertQueryBuilderContract {
  constructor (protected $knexBuilder: knex.QueryBuilder) {
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
    this.$knexBuilder.returning(column)
    return this
  }

  /**
   * Perform insert query
   */
  public insert (columns: any, defer = false): Promise<any> | any {
    this.$knexBuilder.insert(columns)

    if (!defer) {
      return this.exec()
    }

    return this
  }

  /**
   * Insert multiple rows in a single query
   */
  public multiInsert (columns: any, defer = false): Promise<any> | any {
    return this.insert(columns, defer)
  }

  /**
   * Executes the insert query
   */
  public async exec (): Promise<any> {
    const returnValue = await this.$knexBuilder
    return returnValue
  }

  /**
   * Get SQL representation of the constructed query
   */
  public toSQL () {
    return this.$knexBuilder.toSQL()
  }

  /**
   * Returns string representation of the query
   */
  public toString () {
    return this.$knexBuilder.toString()
  }
}
