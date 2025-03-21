/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import * as errors from '../errors.js'
import { IsolationLevels } from '../types/query.js'
import { DatabaseClient } from './abstract_client.js'
import { TransactionClient } from './transaction_client.js'

export class QueryClient extends DatabaseClient {
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
    if (this.mode === 'read') {
      throw new errors.E_CANNOT_BEGIN_TRANSACTION()
    }

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
