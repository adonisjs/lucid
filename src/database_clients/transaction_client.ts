/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import Hooks from '@poppinss/hooks'
import { DatabaseClient } from './abstract_client.js'
import type { IsolationLevels } from '../types/query.js'
import type { Connection } from '../connection/connection.js'
import type { DatabaseEmitter } from '../types/connection.js'
import { commitTransaction, rollbackTransaction } from '../tracing_channels.js'
import { debug } from '../debug.js'

export class TransactionClient extends DatabaseClient {
  #startedAt: [number, number]

  /**
   * Hooks to execute around committing and rollingback a
   * transaction
   */
  #hooks: Hooks<{
    'after:commit': [[trx: TransactionClient], [trx: TransactionClient]]
    'after:rollback': [[trx: TransactionClient], [trx: TransactionClient]]
  }> = new Hooks()

  /**
   * Always true
   */
  isTransaction: boolean = true

  /**
   * Whether or not transaction has been completed
   */
  get isCompleted() {
    return this.knexTransaction.isCompleted()
  }

  constructor(
    connection: Connection,
    protected knexTransaction: Knex.Transaction,
    public readonly mode: 'dual' | 'write',
    emitter?: DatabaseEmitter
  ) {
    super(connection, mode, emitter)
    this.#startedAt = process.hrtime()
  }

  /**
   * Returns reference to the transaction client for executing
   * read queries
   */
  getReadClient(): Knex {
    return this.knexTransaction
  }

  /**
   * Returns reference to the transaction client for executing
   * write queries
   */
  getWriteClient(): Knex {
    return this.knexTransaction
  }

  /**
   * Register after commit or rollback hook
   */
  after(event: 'rollback' | 'commit', handler: () => void | Promise<void>) {
    this.#hooks.add(`after:${event}`, handler)
    return this
  }

  /**
   * Commit the transaction
   */
  commit(): Promise<void> {
    const tracingData = { ...this.getContext() }
    const event = this.createEvent('db:transaction:commit', this.debug)

    return commitTransaction.tracePromise(async () => {
      debug('committing transaction')
      await this.knexTransaction.commit()
      tracingData.duration = process.hrtime(this.#startedAt)

      try {
        await this.#hooks.runner('after:commit').run(this)
      } finally {
        this.#hooks.clear('after:commit')
      }

      debug('committed transaction')
      event.emit(tracingData)
    }) as unknown as Promise<void>
  }

  /**
   * Rollback the transaction
   */
  rollback(): Promise<void> {
    const tracingData = { ...this.getContext() }
    const event = this.createEvent('db:transaction:rollback', this.debug)

    return rollbackTransaction.tracePromise(async () => {
      debug('rolling back transaction')
      await this.knexTransaction.rollback()
      tracingData.duration = process.hrtime(this.#startedAt)

      try {
        await this.#hooks.runner('after:rollback').run(this)
      } finally {
        this.#hooks.clear('after:rollback')
      }

      debug('rolled back transaction')
      event.emit(tracingData)
    }) as unknown as Promise<void>
  }

  /**
   * Begins a database transaction and returns an instance of the {@link TransactionClient}
   * to commit or rollback the transaction. A save point is created when there is
   * already an existing transaction in the same scope.
   *
   * **Managed transaction**
   * Managed transaction is created when you pass a callback as the first argument
   * to the `transaction` method. The transaction will auto commit after executing
   * the callback. In case of an error, it will rollback automatically and throws
   * an error.
   *
   * @example
   * ```ts
   * await db.transaction(async (trx) => {
   *   await trx.insertInto('users').values({})
   * })
   * ```
   *
   * **Self manage transaction**
   * If you want to self manage the transaction, then you must not specify any
   * callback and instead call "commit" or "rollback" methods manually.
   *
   * @example
   * ```ts
   * const trx = await db.transaction()
   * await trx.insertInto('users').values({})
   *
   * await trx.commit()
   * ```
   */
  transaction(options?: { isolationLevel?: IsolationLevels }): Promise<TransactionClient>
  transaction<T>(
    callback: (trx: TransactionClient) => T,
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<T>
  async transaction<T>(
    callbackOrOptions?: ((trx: TransactionClient) => T) | { isolationLevel?: IsolationLevels },
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<T | TransactionClient> {
    if (typeof callbackOrOptions === 'function') {
      const trx = new TransactionClient(
        this.connection,
        await this.beginTransaction(options),
        this.mode,
        this.emitter
      )
      trx.debug = this.debug
      this.copyHooks(trx)

      try {
        const response = await callbackOrOptions(trx)
        if (!trx.isCompleted) {
          await trx.commit()
        }
        return response
      } catch (error) {
        await trx.rollback()
        throw error
      }
    }

    const trx = new TransactionClient(
      this.connection,
      await this.beginTransaction(callbackOrOptions),
      this.mode,
      this.emitter
    )

    trx.debug = this.debug
    this.copyHooks(trx)
    return trx
  }
}
