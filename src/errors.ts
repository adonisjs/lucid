/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { createError, Exception } from '@poppinss/utils/exception'
import { type LucidModel } from './types/model.js'

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
  'Relation "%s" expects "%s" to exist on "%s" model, but is missing. Did you forget to define the column?',
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

export const E_MISSING_MODEL_ENCRYPTION = createError<[string]>(
  'Cannot use encrypted column "%s" without a configured encryption provider. Call "BaseModel.useEncryption()" before querying or persisting encrypted columns',
  'E_MISSING_MODEL_ENCRYPTION',
  500
)

export const E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION = createError<[string, string]>(
  'Invalid encrypted column configuration for "%s". %s',
  'E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION',
  500
)

export const E_UNSUPPORTED_ENCRYPTED_COLUMN_QUERY = createError<[string, string]>(
  'Cannot use "%s" on encrypted column "%s". Only equality-based queries are supported',
  'E_UNSUPPORTED_ENCRYPTED_COLUMN_QUERY',
  500
)

/**
 * The "E_ROW_NOT_FOUND" exception is raised when
 * no row is found in a database single query
 *
 * The "error.model" can be used to know the model which
 * raised the error. This will only be present when using
 * Lucid models not Database queries
 */
export const E_ROW_NOT_FOUND = class extends Exception {
  static readonly status: number = 404
  static readonly code: string = 'E_ROW_NOT_FOUND'
  static readonly message: string = 'Row not found'

  /**
   * The model that raised the error.
   */
  model?: LucidModel

  constructor(model?: LucidModel) {
    super()
    this.model = model
  }
}

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

/**
 * The client is not supported by Lucid
 */
export const E_UNSUPPORTED_CLIENT = createError<[string]>(
  'Unsupported client "%s"',
  'E_UNSUPPORTED_CLIENT',
  500
)
