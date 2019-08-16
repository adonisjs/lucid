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
import { TransactionClientContract } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

import {
  RawContract,
  InsertQueryBuilderContract,
  DatabaseQueryBuilderContract,
} from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

import { RawQueryBuilder } from '../QueryBuilder/Raw'
import { InsertQueryBuilder } from '../QueryBuilder/Insert'
import { DatabaseQueryBuilder } from '../QueryBuilder/Database'

/**
 * Transaction uses a dedicated connection from the connection pool
 * and executes queries inside a given transaction.
 */
export class TransactionClient implements TransactionClientContract {
  /**
   * Always true
   */
  public isTransaction: true = true

  constructor (public knexClient: knex.Transaction, public dialect: string) {
  }

  /**
   * Whether or not transaction has been completed
   */
  public get isCompleted () {
    return this.knexClient.isCompleted()
  }

  /**
   * Returns the read client. Which is just a single client in case
   * of transactions
   */
  public getReadClient () {
    return this.knexClient
  }

  /**
   * Returns the write client. Which is just a single client in case
   * of transactions
   */
  public getWriteClient () {
    return this.knexClient
  }

  /**
   * Truncate tables inside a transaction
   */
  public async truncate (table: string): Promise<void> {
    await this.knexClient.select(table).truncate()
  }

  /**
   * Get columns info inside a transaction. You won't need it here, however
   * added for API compatibility with the [[Connection]] class
   */
  public async columnsInfo (table: string, column?: string): Promise<any> {
    const query = this.knexClient.select(table)
    const result = await (column ? query.columnInfo(column) : query.columnInfo())
    return result
  }

  /**
   * Get a new query builder instance
   */
  public query (): DatabaseQueryBuilderContract {
    return new DatabaseQueryBuilder(this.knexClient.queryBuilder())
  }

  /**
   * Get a new insert query builder instance
   */
  public insertQuery (): InsertQueryBuilderContract {
    return new InsertQueryBuilder(this.knexClient.queryBuilder())
  }

  /**
   * Returns another instance of transaction with save point
   */
  public async transaction (): Promise<TransactionClientContract> {
    const trx = await this.knexClient.transaction()
    return new TransactionClient(trx, this.dialect)
  }

  /**
   * Execute raw query on transaction
   */
  public raw (sql: any, bindings?: any): RawContract {
    return new RawQueryBuilder(this.knexClient.raw(sql, bindings))
  }

  /**
   * Same as [[Transaction.query]] but also selects the table
   */
  public from (table: any): DatabaseQueryBuilderContract {
    return this.query().from(table)
  }

  /**
   * Same as [[Transaction.insertTable]] but also selects the table
   */
  public table (table: any): InsertQueryBuilderContract {
    return this.insertQuery().table(table)
  }

  /**
   * Commit the transaction
   */
  public async commit () {
    await this.knexClient.commit()
  }

  /**
   * Rollback the transaction
   */
  public async rollback () {
    await this.knexClient.rollback()
  }
}
