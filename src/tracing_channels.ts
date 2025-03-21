/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import diagnostics_channel from 'node:diagnostics_channel'
import type {
  DbQueryEventData,
  DbTransactionBeginEventData,
  DbTransactionCommitEventData,
  DbTransactionRollbackEventData,
} from './types/query.js'

/**
 * Traces SQL queries performed by the query clients.
 */
export const queryTracer = diagnostics_channel.tracingChannel<'db-query', DbQueryEventData>(
  'db-query'
)

/**
 * Traces time taken to begin a transaction
 */
export const beginTransactionTracer = diagnostics_channel.tracingChannel<
  'db-transaction-begin',
  DbTransactionBeginEventData
>('db-transaction-begin')

/**
 * Traces time taken to commit a transaction
 */
export const commitTransactionTracer = diagnostics_channel.tracingChannel<
  'db-transaction-commit',
  DbTransactionCommitEventData
>('db-transaction-commit')

/**
 * Traces time taken to rollback a transaction
 */
export const rollbackTransactionTracer = diagnostics_channel.tracingChannel<
  'db-transaction-rollback',
  DbTransactionRollbackEventData
>('db-transaction-rollback')
