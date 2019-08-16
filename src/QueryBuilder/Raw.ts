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
import { RawContract, TransactionClientContract } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

/**
 * Exposes the API to execute raw queries
 */
export class RawQueryBuilder implements RawContract {
  constructor (protected $knexBuilder: knex.Raw) {
  }

  /**
   * Wrap the query with before/after strings.
   */
  public wrap (before: string, after: string): this {
    this.$knexBuilder.wrap(before, after)
    return this
  }

  /**
   * Required when Promises are extended
   */
  public get [Symbol.toStringTag] () {
    return this.constructor.name
  }

  /**
   * Turn on/off debugging for this query
   */
  public debug (debug: boolean): this {
    this.$knexBuilder.debug(debug)
    return this
  }

  /**
   * Define query timeout
   */
  public timeout (time: number, options?: { cancel: boolean }): this {
    this.$knexBuilder['timeout'](time, options)
    return this
  }

  /**
   * Use transaction connection
   */
  public useTransaction (trx: TransactionClientContract): this {
    this.$knexBuilder.transacting(trx.knexClient)
    return this
  }

  /**
   * Returns SQL query as a string
   */
  public toQuery (): string {
    return this.$knexBuilder.toQuery()
  }

  /**
   * Executes the query
   */
  public async exec (): Promise<any> {
    const result = await this.$knexBuilder
    return result
  }

  /**
   * Get sql representation of the query
   */
  public toSQL (): knex.Sql {
    return this.$knexBuilder.toSQL()
  }

  /**
   * Implementation of `then` for the promise API
   */
  public then (resolve: any, reject?: any): any {
    return this.exec().then(resolve, reject)
  }

  /**
   * Implementation of `catch` for the promise API
   */
  public catch (reject: any): any {
    return this.exec().catch(reject)
  }

  /**
   * Implementation of `finally` for the promise API
   */
  public finally (fullfilled: any) {
    return this.exec().finally(fullfilled)
  }
}
