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

export const E_MISSING_MODEL_PROPERTY = createError<[model: string, property: string]>(
  'The property %s.%s either does not exist or was not retrieved from the database.',
  'E_INVALID_REPLICAS_CONFIG',
  500
)

export const E_INVALID_SQL_EXPRESSION = createError<[expression: any, action: string]>(
  'Invalid SQL expression "%s" provided to the "%s" method',
  'E_INVALID_SQL_EXPRESSION',
  500
)
