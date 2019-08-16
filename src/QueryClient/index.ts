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
import {
  RawContract,
  QueryClientContract,
  TransactionClientContract,
  InsertQueryBuilderContract,
  DatabaseQueryBuilderContract,
} from '@ioc:Adonis/Addons/DatabaseQueryBuilder'
import { resolveClientNameWithAliases } from 'knex/lib/helpers'

import { TransactionClient } from '../TransactionClient'
import { RawQueryBuilder } from '../QueryBuilder/Raw'
import { InsertQueryBuilder } from '../QueryBuilder/Insert'
import { DatabaseQueryBuilder } from '../QueryBuilder/Database'

/**
 * Query client exposes the API to fetch instance of different query builders
 * to perform queries on a selection connection.
 */
export class QueryClient implements QueryClientContract {
  /**
   * Not a transaction client
   */
  public isTransaction = false

  /**
   * The name of the dialect in use
   */
  public dialect = resolveClientNameWithAliases(this._client.client.config)

  constructor (private _client: knex, private _readClient?: knex) {
  }

  /**
   * Returns the read client. The readClient is optional, since we can get
   * an instance of [[QueryClient]] with a sticky write client.
   */
  public getReadClient () {
    return this._readClient || this._client
  }

  /**
   * Returns the write client
   */
  public getWriteClient () {
    return this._client
  }

  /**
   * Truncate table
   */
  public async truncate (table: string): Promise<void> {
    await this._client.select(table).truncate()
  }

  /**
   * Get information for a table columns
   */
  public async columnsInfo (table: string, column?: string): Promise<any> {
    const query = this._client.select(table)
    const result = await (column ? query.columnInfo(column) : query.columnInfo())
    return result
  }

  /**
   * Returns an instance of a transaction. Each transaction will
   * query and hold a single connection for all queries.
   */
  public async transaction (): Promise<TransactionClientContract> {
    const trx = await this._client.transaction()
    return new TransactionClient(trx, this.dialect)
  }

  /**
   * Returns instance of a query builder for selecting, updating
   * or deleting rows
   */
  public query (): DatabaseQueryBuilderContract {
    return new DatabaseQueryBuilder(this._client.queryBuilder(), this)
  }

  /**
   * Returns instance of a query builder for inserting rows
   */
  public insertQuery (): InsertQueryBuilderContract {
    return new InsertQueryBuilder(this._client.queryBuilder(), this)
  }

  /**
   * Returns instance of raw query builder
   */
  public raw (sql: any, bindings?: any): RawContract {
    return new RawQueryBuilder(this._client.raw(sql, bindings))
  }

  /**
   * Returns instance of a query builder and selects the table
   */
  public from (table: any): DatabaseQueryBuilderContract {
    return this.query().from(table)
  }

  /**
   * Returns instance of a query builder and selects the table
   * for an insert query
   */
  public table (table: any): InsertQueryBuilderContract {
    return this.insertQuery().table(table)
  }
}
