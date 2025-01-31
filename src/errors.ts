/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { createError } from '@poppinss/exception'

export const E_INVALID_CONNECTION_CONFIG = createError(
  'Make sure to define read/write "replicas" or define the "connection" options',
  'E_INVALID_CONNECTION_CONFIG',
  500
)

export const E_INVALID_REPLICAS_CONFIG = createError(
  'Make sure to define connection property inside read/write replicas',
  'E_INVALID_REPLICAS_CONFIG',
  500
)
