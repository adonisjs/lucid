/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'

import { debug } from '../debug.js'
import * as errors from '../errors.js'
import { NOOP_EMITTER } from '../helpers.js'
import { DatabaseEmitter } from '../types/connection.js'
import type { DialectContract } from '../types/dialect.js'
import type { Connection } from '../connection/connection.js'
import { beginTransaction, dbQuery } from '../tracing_channels.js'
import { SelectQueryBuilder } from '../query_builders/select_query_builder.js'
import { InsertQueryBuilder } from '../query_builders/insert_query_builder.js'
import { DeleteQueryBuilder } from '../query_builders/delete_query_builder.js'
import { UpdateQueryBuilder } from '../query_builders/update_query_builder.js'
import { RawExpressionBuilder } from '../expression_builders/raw_expression_builder.js'
import { RefExpressionBuilder } from '../expression_builders/ref_expression_builder.js'
import { WithExpressionBuilder } from '../expression_builders/with_expression_builder.js'
import type {
  CanBeExecuted,
  IsolationLevels,
  DbQueryEventData,
  RawQueryBindings,
  DatabaseClientContract,
  WithExpressionArguments,
  FromExpressionArguments,
} from '../types/query.js'
import { TransactionClient } from './transaction_client.js'
import { FunctionExpressionBuilder } from '../expression_builders/function_expression_builder.js'

/**
 * DatabaseClient can be used to create different query builders and execute
 * queries
 */
export abstract class DatabaseClient implements DatabaseClientContract {
  /**
   * Context to share with all queries
   */
  #context: Record<string, any> = {}

  /**
   * Emitter reference for emitting events
   */
  protected emitter: DatabaseEmitter

  /**
   * Callbacks to execute when a new instance of the different query
   * builders are created
   */
  protected queryCallbacks: {
    select: ((query: SelectQueryBuilder) => void)[]
    insert: ((query: InsertQueryBuilder) => void)[]
    update: ((query: UpdateQueryBuilder) => void)[]
    delete: ((query: DeleteQueryBuilder) => void)[]
  } = {
    select: [],
    insert: [],
    update: [],
    delete: [],
  }

  /**
   * Enable/disable query debugging for all the queries initiated
   * using the given instance of the database client
   */
  debug: boolean = false

  /**
   * A flag to know if the current instance of database client is a
   * transaction
   */
  isTransaction: boolean = false

  /**
   * Helpers functions to express parts of a SQL query
   */
  fn = new FunctionExpressionBuilder()

  /**
   * The name of the connection from which the client
   * was originated.
   *
   * @deprecated
   * Instead use {@link Connection.identifier}
   */
  get connectionName() {
    return this.connection.identifier
  }

  /**
   * Unique identifier for the connection
   */
  get connectionIdentifier() {
    return this.connection.identifier
  }

  constructor(
    protected connection: Connection,
    public readonly mode: DatabaseClientContract['mode'],
    emitter?: DatabaseEmitter
  ) {
    this.emitter = emitter ?? NOOP_EMITTER
  }

  /**
   * To be implemented by the child class
   */
  abstract transaction(options?: { isolationLevel?: IsolationLevels }): Promise<TransactionClient>
  abstract transaction<T>(
    callback: (trx: TransactionClient) => T,
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<T>

  /**
   * Creates a local event object to emit a given event. The method
   * acts as a helper to get rid of conditional emitting.
   */
  protected createEvent(eventName: string, debuggingEnabled: boolean) {
    return {
      eventName,
      emitter: this.emitter,
      startedAt:
        debuggingEnabled && this.emitter.hasListeners(eventName) ? process.hrtime() : undefined,
      emit(data: any) {
        if (this.startedAt) {
          this.emitter.emit(this.eventName, { ...data, duration: process.hrtime(this.startedAt) })
        }
      },
    }
  }

  /**
   * Begins the database transaction. Emits the "db:transaction:begin" event
   * and wraps the method inside a tracer
   */
  protected beginTransaction(options?: {
    isolationLevel?: IsolationLevels
  }): Promise<Knex.Transaction> {
    const tracingData = { ...this.getContext(), isSavePoint: this.isTransaction }
    const event = this.createEvent('db:transaction:begin', this.debug)

    return beginTransaction.tracePromise(async () => {
      const trx = await this.getWriteClient().transaction(options)
      debug('begin transaction')
      event.emit(tracingData)

      return trx
    }, tracingData) as unknown as Promise<Knex.Transaction>
  }

  /**
   * Copy hooks from the current client to a new client
   */
  protected copyHooks(client: DatabaseClientContract) {
    this.queryCallbacks.select.forEach((cb) => client.onQuery(cb))
    this.queryCallbacks.insert.forEach((cb) => client.onInsertQuery(cb))
    this.queryCallbacks.update.forEach((cb) => client.onUpdateQuery(cb))
    this.queryCallbacks.delete.forEach((cb) => client.onDeleteQuery(cb))
  }

  /**
   * Returns the query context
   */
  getContext(): Record<string, any> {
    return this.#context
  }

  /**
   * Define the context to be shared with the query builders created
   * using the given DatabaseClient.
   *
   * This method will override existing context with provided values.
   * Use {@link DatabaseClientContract.withContext} to merge values
   */
  setContext(context: Record<string, any>): this {
    this.#context = context
    return this
  }

  /**
   * Define the context to be shared with the query builders created
   * using the given DatabaseClient.
   *
   * The provided values will be shallow merged with the existing
   * values. Use {@link DatabaseClientContract.setContext} to remove existing context with
   * new values.
   */
  withContext(context: Record<string, any>): this {
    Object.assign(this.#context, context)
    return this
  }

  /**
   * Returns the dialect for the given connection. The method throws an
   * error when the DatabaseClient instance is created in read mode and
   * you try to access the dialect.
   */
  getDialect(): DialectContract {
    if (this.mode === 'read') {
      throw new errors.E_CANNOT_PERFORM_WRITE_QUERIES()
    }

    return this.connection.dialect
  }

  /**
   * Returns reference to the read client for executing the
   * read queries.
   *
   * - Returns write client when `mode=write`
   * - Returns read client when `mode=dual|read`.
   */
  getReadClient(): Knex {
    if (this.mode === 'write') {
      return this.connection.getWriteClient()
    }
    return this.connection.getReadClient()
  }

  /**
   * Returns reference to the write client for executing the
   * write queries. This method will throw an error when the
   * DatabaseClient instance is created in "read" mode.
   */
  getWriteClient(): Knex {
    if (this.mode === 'read') {
      throw new errors.E_CANNOT_PERFORM_WRITE_QUERIES()
    }
    return this.connection.getWriteClient()
  }

  /**
   * Returns instance of the {@link RefExpressionBuilder}. Ref expressions can
   * be used to specify a column value with methods that accepts a value.
   *
   * You cannot execute a ref expression
   *
   * @example
   * ```ts
   * db.selectFrom('users').where('email', '=', db.ref('username'))
   * ```
   */
  ref(reference: string): RefExpressionBuilder {
    return new RefExpressionBuilder(reference)
  }

  /**
   * Returns instance of the {@link RawExpressionBuilder}. Raw expressions can
   * be used to specify raw queries as the argument of a method.
   *
   * RawExpressions cannot be executed. Instead use {@link DatabaseClientContract.rawQuery}
   * to create an executable raw query.
   *
   * @example
   * ```ts
   * db.selectFrom('users').where(db.raw('?? = ??', ['email', 'username']))
   * ```
   */
  raw(sql: string, bindings?: RawQueryBindings): RawExpressionBuilder {
    return new RawExpressionBuilder(sql, bindings)
  }

  /**
   * Listen when a new instance of the {@link SelectQueryBuilder} is created.
   *
   * You can use this hook to modify query builder instances created using
   * a given instance of a DatabaseClient.
   *
   * ```ts
   * db.onQuery((query) => query.whereNull('is_deleted'))
   * ```
   */
  onQuery(callback: (query: SelectQueryBuilder) => void): void {
    this.queryCallbacks.select.push(callback)
  }

  /**
   * Listen when a new instance of the {@link InsertQueryBuilder} is created.
   *
   * You can use this hook to modify query builder instances created using
   * a given instance of a DatabaseClient.
   */
  onInsertQuery(callback: (query: InsertQueryBuilder) => void): void {
    this.queryCallbacks.insert.push(callback)
  }

  /**
   * Listen when a new instance of the {@link UpdateQueryBuilder} is created.
   * You can use this hook to modify query builder instances created using
   * a given instance of a DatabaseClient.
   *
   * ```ts
   * db.onUpdateQuery((query) => query.where('tenant_id', tenant.id))
   * ```
   */
  onUpdateQuery(callback: (query: UpdateQueryBuilder) => void): void {
    this.queryCallbacks.update.push(callback)
  }

  /**
   * Listen when a new instance of the {@link DeleteQueryBuilder} is created.
   *
   * You can use this hook to modify query builder instances created using
   * a given instance of a DatabaseClient.
   *
   * ```ts
   * db.onDeleteQuery((query) => query.where('tenant_id', tenant.id))
   * ```
   */
  onDeleteQuery(callback: (query: DeleteQueryBuilder) => void): void {
    this.queryCallbacks.delete.push(callback)
  }

  /**
   * Create an instance of the {@link UpdateQueryBuilder} and specify
   * the table to update
   */
  updateTable(tableName: string): UpdateQueryBuilder {
    return this.updateQuery().table(tableName)
  }

  /**
   * Create an instance of the {@link DeleteQueryBuilder} and specify
   * the table to delete from
   */
  deleteFrom(tableName: string): DeleteQueryBuilder {
    return this.deleteQuery().table(tableName)
  }

  /**
   * Returns an instance of the  {@link SelectQueryBuilder} and specifies
   * the table(s) for selection.
   *
   * @example
   * ```ts
   * db.selectFrom('users').exec()
   * ```
   */
  selectFrom(...expression: FromExpressionArguments): SelectQueryBuilder {
    return this.query().from(...expression)
  }

  /**
   * Returns an instance of the {@link SelectQueryBuilder} and specifies
   * the table(s) for selection
   *
   * @deprecated
   * Instead use {@link AbstractClient.selectFrom}
   */
  from(...expression: FromExpressionArguments): SelectQueryBuilder {
    return this.selectFrom(...expression)
  }

  /**
   * Returns an instance of the  {@link InsertQueryBuilder} and specifies
   * the table in which to insert the data.
   *
   * @example
   * ```ts
   * db.insertInto('users').values({
   * }).exec()
   *
   * // bulk insert
   * db.insertInto('users').values([
   *   {},
   *   {},
   * ]).exec()
   * ```
   *
   * // insert using subquery
   * db.insertInto('users')
   *  .columns([])
   *  .using(() => {
   *  }).exec()
   * ```
   */
  insertInto(tableName: string): InsertQueryBuilder {
    return this.insertQuery().table(tableName)
  }

  /**
   * Returns an instance of the  {@link InsertQueryBuilder} and specifies
   * the table in which to insert the data.
   *
   * @deprecated
   * Instead use {@link AbstractClient.insertInto}
   */
  table(tableName: string): InsertQueryBuilder {
    return this.insertInto(tableName)
  }

  /**
   * Creates an instance of the {@link SelectQueryBuilder}
   */
  query() {
    const query = new SelectQueryBuilder(this).setContext({ ...this.#context })
    this.queryCallbacks.select.forEach((cb) => cb(query))
    return query
  }

  /**
   * Creates an instance of the {@link InsertQueryBuilder}
   */
  insertQuery() {
    const query = new InsertQueryBuilder(this).setContext({ ...this.#context })
    this.queryCallbacks.insert.forEach((cb) => cb(query))
    return query
  }

  /**
   * Creates an instance of the {@link DeleteQueryBuilder}
   */
  deleteQuery(): DeleteQueryBuilder {
    const query = new DeleteQueryBuilder(this).setContext({ ...this.#context })
    this.queryCallbacks.delete.forEach((cb) => cb(query))
    return query
  }

  /**
   * Creates an instance of the {@link UpdateQueryBuilder}
   */
  updateQuery(): UpdateQueryBuilder {
    const query = new UpdateQueryBuilder(this).setContext({ ...this.#context })
    this.queryCallbacks.update.forEach((cb) => cb(query))
    return query
  }

  /**
   * Creates a common table expression query.
   *
   * @example
   * ```ts
   * db.with('jennifers', (client) => {
   *   db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
   * })
   * .selectFrom('jennifers')
   * .select('*')
   * ```
   */
  with(...expression: WithExpressionArguments): WithExpressionBuilder {
    return new WithExpressionBuilder(this, 'with').with(...expression)
  }

  /**
   * Creates a recursive common table expression query.
   *
   * @example
   * ```ts
   * db.withRecursive('jennifers', (client) => {
   *   db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
   * })
   * .selectFrom('jennifers')
   * .select('*')
   * ```
   */
  withRecursive(...expression: WithExpressionArguments) {
    return new WithExpressionBuilder(this, 'withRecursive').with(...expression)
  }

  /**
   * Creates a common table expression query as a materialized view. Works
   * only with "PostgreSQL" and "SQLite".
   *
   * @example
   * ```ts
   * db.withMaterialized('jennifers', (client) => {
   *   db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
   * })
   * .selectFrom('jennifers')
   * .select('*')
   * ```
   */
  withMaterialized(...expression: WithExpressionArguments) {
    return new WithExpressionBuilder(this, 'withMaterialized').with(...expression)
  }

  /**
   * Creates a common table expression query with "not materialized" expression. Works
   * only with "PostgreSQL" and "SQLite".
   *
   * @example
   * ```ts
   * db.withMaterialized('jennifers', (client) => {
   *   db.selectFrom('person').where('first_name', '=', 'Jennifer').select(['id', 'age'])
   * })
   * .selectFrom('jennifers')
   * .select('*')
   * ```
   */
  withNotMaterialized(...expression: WithExpressionArguments) {
    return new WithExpressionBuilder(this, 'withNotMaterialized').with(...expression)
  }

  /**
   * Executes a executable query and returns its results back.
   */
  async exec<T>(query: CanBeExecuted): Promise<T> {
    let connection: any | undefined
    let knex: Knex | undefined

    /**
     * When not inside a transaction, we manually acquire a connection
     * from the connection pool and self manage it. This way we are
     * able to do a couple of things.
     *
     * - Switch client for a query after creating the query
     * - Track query execution time without accounting for the time taken
     *   to acquire a connection.
     */
    if (!this.isTransaction) {
      knex = query.queryType === 'read' ? this.getReadClient() : this.getWriteClient()
      connection = await knex.client.acquireConnection()
      debug('acquired connection "%s" for executing the query', connection.__knexUid)

      /**
       * Explicitly set the connection to be used by the query
       */
      query.knexQuery.connection(connection)
    }

    try {
      /**
       * Data for tracing and the "db:query" event. We have to force
       * cast it to "DbQueryEventData" since those values are added
       * via the Knex query builder event
       */
      const tracingData = { ...query.getContext() } as DbQueryEventData
      const event = this.createEvent('db:query', query.debugging)

      const result = (await dbQuery.tracePromise(async () => {
        /**
         * This logic will mess up if one query instance is used to execute
         * multiple times, which in itself is incorrect usage of the
         * query builder.
         */
        ;(query.knexQuery as any).once('query', (sql: Knex.Sql) => {
          debug('executing query %O', sql)
          Object.assign(tracingData, sql)
        })

        const queryResults = await query.knexQuery
        event.emit(tracingData)

        return queryResults
      }, tracingData)) as unknown as Promise<T>

      return result
    } finally {
      if (knex && connection) {
        debug('releasing connection "%s" back to the pool', connection.__knexUid)
        await knex.client.releaseConnection(connection)
      }
    }
  }
}
