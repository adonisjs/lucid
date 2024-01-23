/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { Knex } from 'knex'
import { EventEmitter } from 'events'
import { Hooks } from '@poppinss/hooks'
import { EmitterContract } from '@ioc:Adonis/Core/Event'
import { ProfilerRowContract } from '@ioc:Adonis/Core/Profiler'
import {
  IsolationLevels,
  DialectContract,
  TransactionClientContract,
} from '@ioc:Adonis/Lucid/Database'

import { ModelQueryBuilder } from '../Orm/QueryBuilder'
import { RawBuilder } from '../Database/StaticBuilder/Raw'
import { RawQueryBuilder } from '../Database/QueryBuilder/Raw'
import { InsertQueryBuilder } from '../Database/QueryBuilder/Insert'
import { ReferenceBuilder } from '../Database/StaticBuilder/Reference'
import { DatabaseQueryBuilder } from '../Database/QueryBuilder/Database'

/**
 * Transaction uses a dedicated connection from the connection pool
 * and executes queries inside a given transaction.
 */
export class TransactionClient extends EventEmitter implements TransactionClientContract {
  /**
   * Always true
   */
  public isTransaction: true = true

  /**
   * Transactions are always in write mode, since they always needs
   * the primary connection
   */
  public mode: 'dual' = 'dual'

  /**
   * The profiler to be used for profiling queries
   */
  public profiler?: ProfilerRowContract

  private hooks = new Hooks()

  constructor(
    public knexClient: Knex.Transaction,
    public dialect: DialectContract,
    public connectionName: string,
    public debug: boolean,
    public emitter: EmitterContract
  ) {
    super()

    /**
     * Lucid models listens for transaction events to delete the reference. During
     * testing, it is common to generate more than 10 model instances and hence
     * the max listeners limit needs to be removed
     */
    this.setMaxListeners(Infinity)
  }

  /**
   * Whether or not transaction has been completed
   */
  public get isCompleted() {
    return this.knexClient.isCompleted()
  }

  /**
   * Returns schema instance for the write client
   */
  public get schema() {
    return this.getWriteClient().schema
  }

  /**
   * Returns the read client. Which is just a single client in case
   * of transactions
   */
  public getReadClient() {
    return this.knexClient
  }

  /**
   * Returns the write client. Which is just a single client in case
   * of transactions
   */
  public getWriteClient() {
    return this.knexClient
  }

  /**
   * Truncate tables inside a transaction
   */
  public async truncate(table: string, cascade: boolean = false): Promise<void> {
    await this.dialect.truncate(table, cascade)
  }

  /**
   * Get columns info inside a transaction. You won't need it here, however
   * added for API compatibility with the [[QueryClient]] class
   */
  public async columnsInfo(table: string, column?: string): Promise<any> {
    const query = this.knexClient.select(table)
    const result = await (column ? query.columnInfo(column) : query.columnInfo())
    return result
  }

  /**
   * Returns an array of table names
   */
  public async getAllTables(schemas?: string[]): Promise<string[]> {
    return this.dialect.getAllTables(schemas)
  }

  /**
   * Returns an array of all views names
   */
  public async getAllViews(schemas?: string[]): Promise<string[]> {
    return this.dialect.getAllViews(schemas)
  }

  /**
   * Returns an array of all types names
   */
  public async getAllTypes(schemas?: string[]): Promise<string[]> {
    return this.dialect.getAllTypes(schemas)
  }

  /**
   * Returns an array of all domains names
   */
  public async getAllDomains(schemas?: string[]): Promise<string[]> {
    return this.dialect.getAllDomains(schemas)
  }

  /**
   * Drop all tables inside database
   */
  public async dropAllTables(schemas?: string[]): Promise<void> {
    return this.dialect.dropAllTables(schemas || ['public'])
  }

  /**
   * Drop all views inside the database
   */
  public async dropAllViews(schemas?: string[]): Promise<void> {
    return this.dialect.dropAllViews(schemas || ['public'])
  }

  /**
   * Drop all custom types inside the database
   */
  public async dropAllTypes(schemas?: string[]): Promise<void> {
    return this.dialect.dropAllTypes(schemas || ['public'])
  }

  /**
   * Drop all domains inside the database
   */
  public async dropAllDomains(schemas?: string[]): Promise<void> {
    return this.dialect.dropAllDomains(schemas || ['public'])
  }

  /**
   * Get a new query builder instance
   */
  public knexQuery(): Knex.QueryBuilder {
    return this.knexClient.queryBuilder()
  }

  /**
   * Returns the knex raw query builder instance. The query builder is always
   * created from the `write` client, so before executing the query, you
   * may want to decide which client to use.
   */
  public knexRawQuery(sql: string, bindings?: any): Knex.Raw {
    return bindings ? this.knexClient.raw(sql, bindings) : this.knexClient.raw(sql)
  }

  /**
   * Returns a query builder instance for a given model. The `connection`
   * and `profiler` is passed down to the model, so that it continue
   * using the same options
   */
  public modelQuery(model: any): any {
    return new ModelQueryBuilder(this.knexQuery(), model, this)
  }

  /**
   * Get a new query builder instance
   */
  public query(): any {
    return new DatabaseQueryBuilder(this.knexQuery(), this)
  }

  /**
   * Get a new insert query builder instance
   */
  public insertQuery(): any {
    return new InsertQueryBuilder(this.knexQuery(), this)
  }

  /**
   * Execute raw query on transaction
   */
  public rawQuery(sql: any, bindings?: any): any {
    return new RawQueryBuilder(this.knexClient.raw(sql, bindings), this)
  }

  /**
   * Returns an instance of raw builder. This raw builder queries
   * cannot be executed. Use `rawQuery`, if you want to execute
   * queries raw queries.
   */
  public raw(sql: string, bindings?: any) {
    return new RawBuilder(sql, bindings)
  }

  /**
   * Returns reference builder.
   */
  public ref(reference: string) {
    return new ReferenceBuilder(reference, this.knexClient.client)
  }

  /**
   * Returns another instance of transaction with save point
   */
  public async transaction(
    callback?:
      | { isolationLevel?: IsolationLevels }
      | ((trx: TransactionClientContract) => Promise<any>),
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<any> {
    const trx = await this.knexClient.transaction(options)
    const transaction = new TransactionClient(
      trx,
      this.dialect,
      this.connectionName,
      this.debug,
      this.emitter
    )

    /**
     * Always make sure to pass the profiler down the chain
     */
    transaction.profiler = this.profiler?.create('trx:begin', { state: 'begin' })

    /**
     * Self managed transaction
     */
    if (typeof callback === 'function') {
      try {
        const response = await callback(transaction)
        !transaction.isCompleted && (await transaction.commit())
        return response
      } catch (error) {
        await transaction.rollback()
        throw error
      }
    }

    return transaction
  }

  /**
   * Same as [[Transaction.query]] but also selects the table
   */
  public from(table: any): any {
    return this.query().from(table)
  }

  /**
   * Same as [[Transaction.insertTable]] but also selects the table
   */
  public table(table: any): any {
    return this.insertQuery().table(table)
  }

  /**
   * Register after commit or rollback hook
   */
  public after(event: 'rollback' | 'commit', handler: () => void | Promise<void>) {
    this.hooks.add('after', event, handler)
    return this
  }

  /**
   * Commit the transaction
   */
  public async commit() {
    try {
      await this.knexClient.commit()
      this.profiler?.end({ state: 'commit' })
      this.emit('commit', this)
      this.removeAllListeners()
    } catch (error) {
      this.profiler?.end({ state: 'commit' })
      this.removeAllListeners()
      throw error
    }

    try {
      await this.hooks.exec('after', 'commit')
      this.hooks.clear('after')
    } catch {}
  }

  /**
   * Rollback the transaction
   */
  public async rollback() {
    try {
      await this.knexClient.rollback()
      this.profiler?.end({ state: 'rollback' })
      this.emit('rollback', this)
      this.removeAllListeners()
    } catch (error) {
      this.profiler?.end({ state: 'rollback' })
      this.removeAllListeners()
      throw error
    }

    try {
      await this.hooks.exec('after', 'rollback')
      this.hooks.clear('after')
    } catch {}
  }

  /**
   * Get advisory lock on the selected connection
   */
  public getAdvisoryLock(key: string, timeout?: number): any {
    return this.dialect.getAdvisoryLock(key, timeout)
  }

  /**
   * Release advisory lock
   */
  public releaseAdvisoryLock(key: string): any {
    return this.dialect.releaseAdvisoryLock(key)
  }
}
