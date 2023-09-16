/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { Exception } from '@poppinss/utils'
import type { Emitter } from '@adonisjs/core/events'

import {
  IsolationLevels,
  DialectContract,
  ConnectionContract,
  QueryClientContract,
  TransactionClientContract,
} from '../../adonis-typings/database.js'

import { dialects } from '../dialects/index.js'
// import { ModelQueryBuilder } from '../Orm/QueryBuilder'
import { TransactionClient } from '../transaction_client/index.js'
import { RawBuilder } from '../database/static_builder/raw.js'
import { RawQueryBuilder } from '../database/query_builder/raw.js'
import { InsertQueryBuilder } from '../database/query_builder/insert.js'
import { ReferenceBuilder } from '../database/static_builder/reference.js'
import { DatabaseQueryBuilder } from '../database/query_builder/database.js'
import { LucidModel, ModelQueryBuilderContract } from '../../adonis-typings/model.js'
import {
  RawQueryBindings,
  DatabaseQueryBuilderContract,
} from '../../adonis-typings/querybuilder.js'

/**
 * Query client exposes the API to fetch instance of different query builders
 * to perform queries on a selecte connection.
 */
export class QueryClient implements QueryClientContract {
  /**
   * Not a transaction client
   */
  readonly isTransaction = false

  /**
   * The dialect in use
   */
  dialect: DialectContract

  /**
   * Name of the connection in use
   */
  readonly connectionName: string

  /**
   * Is debugging enabled
   */
  debug: boolean

  constructor(
    public mode: 'dual' | 'write' | 'read',
    private connection: ConnectionContract,
    public emitter: Emitter<any>
  ) {
    this.debug = !!this.connection.config.debug
    this.connectionName = this.connection.name
    this.dialect = new dialects[this.connection.dialectName](this, this.connection.config)
  }

  /**
   * Returns schema instance for the write client
   */
  get schema(): Knex.SchemaBuilder {
    return this.getWriteClient().schema
  }

  /**
   * Returns the read client. The readClient is optional, since we can get
   * an instance of [[QueryClient]] with a sticky write client.
   */
  getReadClient(): Knex<any, any> {
    if (this.mode === 'read' || this.mode === 'dual') {
      return this.connection.readClient!
    }

    return this.connection.client!
  }

  /**
   * Returns the write client
   */
  getWriteClient(): Knex<any, any> {
    if (this.mode === 'write' || this.mode === 'dual') {
      return this.connection.client!
    }

    throw new Exception(
      'Write client is not available for query client instantiated in read mode',
      {
        status: 500,
        code: 'E_RUNTIME_EXCEPTION',
      }
    )
  }

  /**
   * Truncate table
   */
  async truncate(table: string, cascade?: boolean | undefined): Promise<void> {
    await this.dialect.truncate(table, cascade)
  }

  /**
   * Get information for a table columns
   */
  columnsInfo(table: string): Promise<{ [column: string]: Knex.ColumnInfo }>
  columnsInfo(table: string, column: string): Promise<Knex.ColumnInfo>
  async columnsInfo(
    table: unknown,
    column?: unknown
  ): Promise<{ [column: string]: Knex.ColumnInfo } | Knex.ColumnInfo> {
    const query = this.getWriteClient().table(table as string)

    if (column) {
      query.columnInfo(column as string)
    } else {
      query.columnInfo()
    }

    const result = await query
    return result
  }

  /**
   * Returns an array of table names
   */
  async getAllTables(schemas?: string[] | undefined): Promise<string[]> {
    return this.dialect.getAllTables(schemas)
  }

  /**
   * Returns an array of all views names
   */
  async getAllViews(schemas?: string[] | undefined): Promise<string[]> {
    return this.dialect.getAllViews(schemas)
  }

  /**
   * Returns an array of all types names
   */
  async getAllTypes(schemas?: string[] | undefined): Promise<string[]> {
    return this.dialect.getAllTypes(schemas)
  }

  /**
   * Drop all tables inside database
   */
  async dropAllTables(schemas?: string[] | undefined): Promise<void> {
    return this.dialect.dropAllTables(schemas || ['public'])
  }

  /**
   * Drop all views inside the database
   */
  async dropAllViews(schemas?: string[] | undefined): Promise<void> {
    return this.dialect.dropAllViews(schemas || ['public'])
  }

  /**
   * Drop all custom types inside the database
   */
  async dropAllTypes(schemas?: string[] | undefined): Promise<void> {
    return this.dialect.dropAllTypes(schemas || ['public'])
  }

  /**
   * Returns an instance of a transaction. Each transaction will
   * query and hold a single connection for all queries.
   */
  async transaction(
    callback?:
      | { isolationLevel?: IsolationLevels }
      | ((trx: TransactionClientContract) => Promise<any>),
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<TransactionClientContract> {
    const trx = await this.getWriteClient().transaction(options)
    const transaction = new TransactionClient(
      trx,
      this.dialect,
      this.connectionName,
      this.debug,
      this.emitter
    )

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
   * Returns the knex query builder instance. The query builder is always
   * created from the `write` client, so before executing the query, you
   * may want to decide which client to use.
   */
  knexQuery(): Knex.QueryBuilder<any, any> {
    return this.connection.client!.queryBuilder()
  }

  /**
   * Returns the knex raw query builder instance. The query builder is always
   * created from the `write` client, so before executing the query, you
   * may want to decide which client to use.
   */
  knexRawQuery(sql: string, bindings?: RawQueryBindings | undefined): Knex.Raw<any> {
    return bindings ? this.connection.client!.raw(sql, bindings) : this.connection.client!.raw(sql)
  }

  /**
   * Returns a query builder instance for a given model.
   */
  modelQuery<T extends LucidModel, Result = T>(model: T): ModelQueryBuilderContract<T, Result> {
    // modelQuery(model: any): any {
    // return new ModelQueryBuilder(this.knexQuery(), model, this)
  }

  /**
   * Returns instance of a query builder for selecting, updating
   * or deleting rows
   */
  query<Result = any>(): DatabaseQueryBuilderContract<Result> {
    return new DatabaseQueryBuilder(this.knexQuery(), this)
  }

  /**
   * Returns instance of a query builder for inserting rows
   */
  insertQuery(): any {
    return new InsertQueryBuilder(this.getWriteClient().queryBuilder(), this)
  }

  /**
   * Returns instance of raw query builder
   */
  rawQuery(sql: any, bindings?: any): any {
    return new RawQueryBuilder(this.connection.client!.raw(sql, bindings), this)
  }

  /**
   * Returns an instance of raw builder. This raw builder queries
   * cannot be executed. Use `rawQuery`, if you want to execute
   * queries raw queries.
   */
  raw(sql: string, bindings?: any) {
    return new RawBuilder(sql, bindings)
  }

  /**
   * Returns reference builder.
   */
  ref(reference: string) {
    return new ReferenceBuilder(reference, this.getReadClient().client)
  }

  /**
   * Returns instance of a query builder and selects the table
   */
  from(table: any): any {
    return this.query().from(table)
  }

  /**
   * Returns instance of a query builder and selects the table
   * for an insert query
   */
  table(table: any): any {
    return this.insertQuery().table(table)
  }

  /**
   * Get advisory lock on the selected connection
   */
  getAdvisoryLock(key: string, timeout?: number): any {
    return this.dialect.getAdvisoryLock(key, timeout)
  }

  /**
   * Release advisory lock
   */
  releaseAdvisoryLock(key: string): any {
    return this.dialect.releaseAdvisoryLock(key)
  }
}
