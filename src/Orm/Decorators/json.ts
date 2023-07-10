/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Exception } from '@poppinss/utils'
import { LucidRow, LucidModel, JsonColumnDecorator } from '@ioc:Adonis/Lucid/Orm'

/**
 * The method to prepare the JSON column before persisting it's
 * value to the database
 */
function prepareJsonColumn(value: any, attributeName: string, modelInstance: LucidRow) {
  const model = modelInstance.constructor as LucidModel
  const modelName = model.name

  /**
   * Return string or missing values as it is.
   */
  if (typeof value === 'string') {
    return value
  }

  try {
    const column = model.$getColumn(attributeName)
    return JSON.stringify(value, column?.meta.replacer, column?.meta.space)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Exception(
        `Cannot stringify "${modelName}.${attributeName}": ${error.message}`,
        500,
        'E_INVALID_JSON_COLUMN_VALUE'
      )
    }

    throw new Exception(
      `Cannot stringify "${modelName}.${attributeName}" ${typeof value} value to a JSON string literal`,
      500,
      'E_INVALID_JSON_COLUMN_VALUE'
    )
  }
}

/**
 * Consume the potential JSON string value and convert it to an object
 */
function consumeJsonColumn(value: any, attributeName: string, modelInstance: LucidRow) {
  const model = modelInstance.constructor as LucidModel
  const modelName = model.name
  const column = model.$getColumn(attributeName)

  const getErrorDescription = (message?: string) => {
    return `Cannot parse value for column "${modelName}.${attributeName}"${
      message ? `: "${message}"` : ' to an object'
    } at ${model.primaryKey}: ${modelInstance.$primaryKeyValue}`
  }

  /**
   * Bypass null columns
   */
  if (!value && typeof value !== 'string') {
    return value
  }

  /**
   * Convert from string
   */
  if (typeof value === 'string') {
    try {
      return JSON.parse(value, column?.meta.reviver)
    } catch (error) {
      if (column?.meta.nullOnParseError) {
        return null
      }

      if (error instanceof SyntaxError) {
        throw new Exception(getErrorDescription(error.message), 500, 'E_INVALID_JSON_COLUMN_VALUE')
      }

      throw new Exception(getErrorDescription(), 500, 'E_INVALID_JSON_COLUMN_VALUE')
    }
  }

  if (column?.meta.nullOnParseError) {
    return null
  }

  /**
   * Any another value cannot be parsed
   */
  throw new Exception(getErrorDescription(), 500, 'E_INVALID_JSON_COLUMN_VALUE')
}

/**
 * Decorator to define a new JSON column
 */
export const jsonColumn: JsonColumnDecorator = (options?) => {
  return function decorateAsColumn(target, property) {
    const Model = target.constructor as LucidModel
    Model.boot()

    const { replacer, space, reviver, nullOnParseError, ...columnOptions } = options || {}

    const normalizedOptions = Object.assign(
      {
        prepare: prepareJsonColumn,
        consume: consumeJsonColumn,
        meta: {},
      },
      columnOptions
    )

    /**
     * Type always has to be a JSON
     */
    normalizedOptions.meta.type = 'json'
    normalizedOptions.meta.replacer = replacer
    normalizedOptions.meta.space = space
    normalizedOptions.meta.reviver = reviver
    normalizedOptions.meta.nullOnParseError = nullOnParseError === true

    Model.$addColumn(property, normalizedOptions)
  }
}
