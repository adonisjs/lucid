/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { SchemaBuilder } from 'knex'
import { Exception } from '@poppinss/utils'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { SchemaContract, DeferCallback } from '@ioc:Adonis/Lucid/Schema'

/**
 * Exposes the API to define table schema using deferred database
 * calls.
 */
export class Schema implements SchemaContract {
  /**
   * All calls to `schema` and `defer` are tracked to be
   * executed later
   */
  private _trackedCalls: (SchemaBuilder | DeferCallback)[] = []

  /**
   * The lifecycle method that was invoked
   */
  private _isFresh: boolean = true

  /**
   * Enable/disable transactions for this schema
   */
  public disableTransactions = false

  /**
   * Returns the schema to build database tables
   */
  public get schema () {
    const schema = this.db.schema
    this._trackedCalls.push(schema)
    return schema
  }

  constructor (
    public db: QueryClientContract,
    public file: string,
    public dryRun: boolean = false,
  ) {}

  /**
   * Returns schema queries sql without executing them
   */
  private _getQueries (): string[] {
    return this._trackedCalls
      .filter((schema) => typeof (schema['toQuery']) === 'function')
      .map((schema) => (schema as SchemaBuilder).toQuery())
  }

  /**
   * Executes schema queries and defer calls in sequence
   */
  private async _executeQueries () {
    for (let trackedCall of this._trackedCalls) {
      if (typeof (trackedCall) === 'function') {
        await trackedCall(this.db)
      } else {
        await trackedCall
      }
    }
  }

  /**
   * Returns raw query for `now`
   */
  public now (precision?: number) {
    return precision
      ? this.db.raw(`CURRENT_TIMESTAMP(${precision})`)
      : this.db.raw('CURRENT_TIMESTAMP')
  }

  /**
   * Wrapping database calls inside defer ensures that they run
   * in the right order and also they won't be executed when
   * schema is invoked to return the SQL queries
   */
  public defer (cb: DeferCallback): void {
    this._trackedCalls.push(cb)
  }

  /**
   * Invokes schema `up` method. Returns an array of queries
   * when `dryRun` is set to true
   */
  public async execUp () {
    if (!this._isFresh) {
      throw new Exception('Cannot execute a given schema twice')
    }

    await this.up()
    this._isFresh = false

    if (this.dryRun) {
      return this._getQueries()
    }

    await this._executeQueries()
    return true
  }

  /**
   * Invokes schema `down` method. Returns an array of queries
   * when `dryRun` is set to true
   */
  public async execDown () {
    if (!this._isFresh) {
      throw new Exception('Cannot execute a given schema twice')
    }

    await this.down()
    this._isFresh = false

    if (this.dryRun) {
      return this._getQueries()
    }

    await this._executeQueries()
    return true
  }

  public async up () {}
  public async down () {}
}
