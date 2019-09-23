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
import { Exception } from '@poppinss/utils'
import { resolveClientNameWithAliases } from 'knex/lib/helpers'
import { ProfilerRowContract, ProfilerContract } from '@ioc:Adonis/Core/Profiler'

import {
  ConnectionContract,
  QueryClientContract,
  TransactionClientContract,
} from '@ioc:Adonis/Lucid/Database'

import { RawQueryBuilder } from '../QueryBuilder/Raw'
import { TransactionClient } from '../TransactionClient'
import { InsertQueryBuilder } from '../QueryBuilder/Insert'
import { DatabaseQueryBuilder } from '../QueryBuilder/Database'

/**
 * Query client exposes the API to fetch instance of different query builders
 * to perform queries on a selection connection.
 *
 * Many of the methods returns `any`, since this class is type casted to an interface,
 * it doesn't real matter what are the return types from this class
 */
export class QueryClient implements QueryClientContract {
  /**
   * Not a transaction client
   */
  public isTransaction = false

  /**
   * The name of the dialect in use
   */
  public dialect: string

  /**
   * The profiler to be used for profiling queries
   */
  public profiler?: ProfilerRowContract | ProfilerContract

  /**
   * Name of the connection in use
   */
  public connectionName = this._connection.name

  constructor (
    public mode: 'dual' | 'write' | 'read',
    private _connection: ConnectionContract,
  ) {
    this.dialect = resolveClientNameWithAliases(this._connection.config.client)
  }

  /**
   * Returns the read client. The readClient is optional, since we can get
   * an instance of [[QueryClient]] with a sticky write client.
   */
  public getReadClient (): knex {
    if (this.mode === 'read' || this.mode === 'dual') {
      return this._connection.readClient!
    }

    return this._connection.client!
  }

  /**
   * Returns the write client
   */
  public getWriteClient (): knex {
    if (this.mode === 'write' || this.mode === 'dual') {
      return this._connection.client!
    }

    throw new Exception(
      'Write client is not available for query client instantiated in read mode',
      500,
      'E_RUNTIME_EXCEPTION',
    )
  }

  /**
   * Truncate table
   */
  public async truncate (table: string): Promise<void> {
    await this.getWriteClient().select(table).truncate()
  }

  /**
   * Get information for a table columns
   */
  public async columnsInfo (table: string, column?: string): Promise<any> {
    const query = this.getWriteClient().select(table)
    const result = await (column ? query.columnInfo(column) : query.columnInfo())
    return result
  }

  /**
   * Returns an instance of a transaction. Each transaction will
   * query and hold a single connection for all queries.
   */
  public async transaction (): Promise<TransactionClientContract> {
    const trx = await this.getWriteClient().transaction()
    const transaction = new TransactionClient(trx, this.dialect, this.connectionName)
    transaction.profiler = this.profiler

    return transaction
  }

  /**
   * Returns instance of a query builder for selecting, updating
   * or deleting rows
   */
  public query (): any {
    return new DatabaseQueryBuilder(this._connection.client!.queryBuilder(), this)
  }

  /**
   * Returns instance of a query builder for inserting rows
   */
  public insertQuery (): any {
    return new InsertQueryBuilder(this.getWriteClient().queryBuilder(), this)
  }

  /**
   * Returns instance of raw query builder
   */
  public raw (sql: any, bindings?: any): any {
    return new RawQueryBuilder(this._connection.client!.raw(sql, bindings), this)
  }

  /**
   * Returns instance of a query builder and selects the table
   */
  public from (table: any): any {
    return this.query().from(table)
  }

  /**
   * Returns instance of a query builder and selects the table
   * for an insert query
   */
  public table (table: any): any {
    return this.insertQuery().table(table)
  }
}
