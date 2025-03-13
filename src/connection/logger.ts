/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import { ConnectionLogger } from '../types/connection.js'

/**
 * Creates logger for knex to proxy knex logs to an external
 * logger
 */
export function createKnexLogger(logger: ConnectionLogger): Knex.Logger {
  return {
    warn: (message: string) => {
      logger.warn(message)
    },
    error: (message: string) => {
      logger.error(message)
    },
    deprecate: (message: string) => {
      logger.info(message)
    },
    debug: (message: string) => {
      logger.warn(
        '"debug" property inside config is depreciated. We recommend using "db:query" event for enrich logging'
      )
      logger.debug(message)
    },
  }
}
