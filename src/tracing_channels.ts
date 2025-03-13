/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import diagnostics_channel from 'node:diagnostics_channel'
import type { DbQueryEventData } from './types/query.js'

/**
 * Traces SQL queries performed by the query clients. You can subscribe to
 * this channel to trace SQL queries.
 */
export const queryTracer = diagnostics_channel.tracingChannel<'db-query', DbQueryEventData>(
  'db-query'
)
