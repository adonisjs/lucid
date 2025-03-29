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
export const dbQuery = diagnostics_channel.tracingChannel<'lucid-db-query', DbQueryEventData>(
  'lucid-db-query'
)

/**
 * Traces time taken to begin a transaction
 */
export const beginTransaction = diagnostics_channel.tracingChannel<
  'lucid-begin-transaction',
  DbTransactionBeginEventData
>('lucid-begin-transaction')

/**
 * Traces time taken to commit a transaction
 */
export const commitTransaction = diagnostics_channel.tracingChannel<
  'lucid-commit-transaction',
  DbTransactionCommitEventData
>('lucid-commit-transaction')

/**
 * Traces time taken to rollback a transaction
 */
export const rollbackTransaction = diagnostics_channel.tracingChannel<
  'lucid-rollback-transaction',
  DbTransactionRollbackEventData
>('lucid-rollback-transaction')
