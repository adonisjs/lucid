/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { createError } from '@poppinss/utils'

export const E_INVALID_DATE_COLUMN_VALUE = createError<[string, string | null]>(
  'Invalid value for "%s". %s',
  'E_INVALID_DATE_COLUMN_VALUE',
  500
)

export const E_UNMANAGED_DB_CONNECTION = createError<[string]>(
  'Cannot connect to unregistered connection %s',
  'E_UNMANAGED_DB_CONNECTION',
  500
)

export const E_MISSING_MODEL_ATTRIBUTE = createError<[string, string, string]>(
  '"%s" expects "%s" to exist on "%s" model, but is missing',
  'E_MISSING_MODEL_ATTRIBUTE',
  500
)

export const E_INCOMPLETE_REPLICAS_CONFIG = createError(
  'Make sure to define read/write replicas or use connection property',
  'E_INCOMPLETE_REPLICAS_CONFIG',
  500
)

export const E_INVALID_REPLICAS_CONFIG = createError(
  'Make sure to define connection property inside read/write replicas',
  'E_INVALID_REPLICAS_CONFIG',
  500
)

export const E_MODEL_DELETED = createError(
  'Cannot mutate delete model instance',
  'E_MODEL_DELETED',
  500
)

export const E_ROW_NOT_FOUND = createError('Row not found', 'E_ROW_NOT_FOUND', 404)

export const E_UNABLE_ACQUIRE_LOCK = createError(
  'Unable to acquire lock. Concurrent migrations are not allowed',
  'E_UNABLE_ACQUIRE_LOCK',
  500
)

export const E_UNABLE_RELEASE_LOCK = createError(
  'Migration completed, but unable to release database lock',
  'E_UNABLE_RELEASE_LOCK',
  500
)

export const E_MISSING_SCHEMA_FILES = createError(
  'Cannot perform rollback. Schema file "%s" is missing',
  'E_MISSING_SCHEMA_FILES',
  500
)

export const E_UNDEFINED_RELATIONSHIP = createError(
  '"%s" is not defined as a relationship on "%s" model',
  'E_UNDEFINED_RELATIONSHIP',
  500
)

export const E_RUNTIME_EXCEPTION = createError('%s', 'E_RUNTIME_EXCEPTION', 500)
