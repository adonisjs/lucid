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

import { Exception } from '@poppinss/utils'
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
  public dialect: string

  constructor (
    public mode: 'dual' | 'write' | 'read',
    private _client?: knex,
    private _readClient?: knex,
  ) {
    this._validateMode()
    this.dialect = resolveClientNameWithAliases(this._getAvailableClient().client.config)
  }

  /**
   * Returns any of the available clients, giving preference to the
   * write client.
   *
   * One client will always exists, otherwise instantiation of this
   * class will fail.
   */
  private _getAvailableClient () {
    return (this._client || this._readClient)!
  }

  /**
   * Validates the modes against the provided clients to ensure that class is
   * constructed as expected.
   */
  private _validateMode () {
    if (this.mode === 'dual' && (!this._client || !this._readClient)) {
      throw new Exception('Read and write both clients are required in dual mode')
    }

    if (this.mode === 'write' && (!this._client || this._readClient)) {
      throw new Exception('Write client is required in write mode, without the read client')
    }

    if (this.mode === 'read' && (this._client || !this._readClient)) {
      throw new Exception('Read client is required in read mode, without the write client')
    }
  }

  /**
   * Returns the read client. The readClient is optional, since we can get
   * an instance of [[QueryClient]] with a sticky write client.
   */
  public getReadClient () {
    if (this.mode === 'read' || this.mode === 'dual') {
      return this._readClient!
    }

    return this._client!
  }

  /**
   * Returns the write client
   */
  public getWriteClient () {
    if (this.mode === 'write' || this.mode === 'dual') {
      return this._client!
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
    return new TransactionClient(trx, this.dialect)
  }

  /**
   * Returns instance of a query builder for selecting, updating
   * or deleting rows
   */
  public query (): DatabaseQueryBuilderContract {
    return new DatabaseQueryBuilder(this._getAvailableClient().queryBuilder(), this)
  }

  /**
   * Returns instance of a query builder for inserting rows
   */
  public insertQuery (): InsertQueryBuilderContract {
    return new InsertQueryBuilder(this.getWriteClient().queryBuilder(), this)
  }

  /**
   * Returns instance of raw query builder
   */
  public raw (sql: any, bindings?: any): RawContract {
    return new RawQueryBuilder(this._getAvailableClient().raw(sql, bindings))
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
