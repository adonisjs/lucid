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
  if (typeof value === 'string' || !value) {
    return value
  }

  try {
    const column = model.$getColumn(attributeName)
    return JSON.stringify(value, column?.meta.stringifyReplacer, column?.meta.stringifySpace)
  } catch (error) {
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

  const getErrorDescription = () => {
    return `Cannot parse "${modelName}.${attributeName}" ${typeof value} value to an object`
  }

  /**
   * Bypass null columns
   */
  if (!value) {
    return value
  }

  /**
   * Convert from string
   */
  if (typeof value === 'string') {
    try {
      const column = model.$getColumn(attributeName)
      return JSON.parse(value, column?.meta.parseReviver)
    } catch (error) {
      throw new Exception(getErrorDescription(), 500, 'E_INVALID_JSON_COLUMN_VALUE')
    }
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

    const { stringifyReplacer, stringifySpace, parseReviver, ...columnOptions } = options || {}

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
    normalizedOptions.meta.stringifyReplacer = stringifyReplacer
    normalizedOptions.meta.stringifySpace = stringifySpace
    normalizedOptions.meta.parseReviver = parseReviver

    Model.$addColumn(property, normalizedOptions)
  }
}
