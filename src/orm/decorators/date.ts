/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DateTime } from 'luxon'
import * as errors from '../../errors.js'
import { LucidRow, LucidModel, DateColumnDecorator } from '../../types/model.js'

/**
 * The method to prepare the date column before persisting it's
 * value to the database
 */
function prepareDateColumn(value: any, attributeName: string, modelInstance: LucidRow) {
  /**
   * Return string or missing values as it is. If `auto` is set to true on
   * the column, then the hook will always initialize the date
   */
  if (typeof value === 'string' || !value) {
    return value
  }

  const modelName = modelInstance.constructor.name

  /**
   * Format luxon instances to SQL formatted date
   */
  if (DateTime.isDateTime(value)) {
    if (!value.isValid) {
      throw new errors.E_INVALID_DATE_COLUMN_VALUE([
        `${modelName}.${attributeName}`,
        value.invalidReason,
      ])
    }

    return value.toISODate()
  }

  /**
   * Anything else if not an acceptable value for date column
   */
  throw new errors.E_INVALID_DATE_COLUMN_VALUE([
    `${modelName}.${attributeName}`,
    'The value must be an instance of "luxon.DateTime"',
  ])
}

/**
 * Consume database return value and convert it to an instance of luxon.DateTime
 */
function consumeDateColumn(value: any, attributeName: string, modelInstance: LucidRow) {
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
    return DateTime.fromSQL(value)
  }

  /**
   * Convert from date
   */
  if (value instanceof Date) {
    return DateTime.fromJSDate(value)
  }

  /**
   * Any another value cannot be formatted
   */
  const modelName = modelInstance.constructor.name
  throw new errors.E_INVALID_DATE_COLUMN_VALUE([
    `${modelName}.${attributeName}`,
    `${typeof value} cannot be formatted`,
  ])
}

/**
 * Decorator to define a new date column
 */
export const dateColumn: DateColumnDecorator = (options?) => {
  return function decorateAsColumn(target, property) {
    const Model = target.constructor as LucidModel
    Model.boot()

    const normalizedOptions = Object.assign(
      {
        prepare: prepareDateColumn,
        consume: consumeDateColumn,
        serialize: (value: DateTime) => {
          if (DateTime.isDateTime(value)) {
            return value.toISODate()
          }
          return value
        },
        meta: {},
      },
      options
    )

    /**
     * Type always has to be a date
     */
    normalizedOptions.meta.type = 'date'
    normalizedOptions.meta.autoCreate = normalizedOptions.autoCreate === true
    normalizedOptions.meta.autoUpdate = normalizedOptions.autoUpdate === true
    Model.$addColumn(property, normalizedOptions)
  }
}
