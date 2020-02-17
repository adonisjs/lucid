/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { DateTime } from 'luxon'
import { Exception } from '@poppinss/utils'
import {
  ModelContract,
  DateColumnDecorator,
  DateTimeColumnDecorator,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

const DATE_TIME_TYPES = {
  date: 'date',
  datetime: 'datetime',
}

/**
 * The method to prepare the date column before persisting it's
 * value to the database
 */
function prepareDateColumn (value: any, attributeName: string, modelInstance: ModelContract) {
  /**
   * Return string or missing values as it is. If `auto` is set to true on
   * the column, then the hook will always initialize the date
   */
  if (typeof (value) === 'string' || !value) {
    return value
  }

  const modelName = modelInstance.constructor.name

  /**
   * Format luxon instances to SQL formatted date
   */
  if (value instanceof DateTime) {
    if (!value.isValid) {
      throw new Exception(
        `Invalid value for "${modelName}.${attributeName}". ${value.invalidReason}`,
        500,
        'E_INVALID_DATE_COLUMN_VALUE',
      )
    }

    return value.toISODate()
  }

  /**
   * Anything else if not an acceptable value for date column
   */
  throw new Exception(
    `The value for "${modelName}.${attributeName}" must be an instance of "luxon.DateTime"`,
    500,
    'E_INVALID_DATE_COLUMN_VALUE',
  )
}

/**
 * Consume database return value and convert it to an instance of luxon.DateTime
 */
function consumeDateColumn (value: any, attributeName: string, modelInstance: ModelContract) {
  /**
   * Bypass null columns
   */
  if (!value) {
    return value
  }

  /**
   * Convert from string
   */
  if (typeof (value) === 'string') {
    return DateTime.fromISO(value)
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
  throw new Exception(
    `Cannot format "${modelName}.${attributeName}" ${typeof(value)} value to an instance of "luxon.DateTime"`,
    500,
    'E_INVALID_DATE_COLUMN_VALUE',
  )
}

/**
 * The method to prepare the datetime column before persisting it's
 * value to the database
 */
function prepareDateTimeColumn (value: any, attributeName: string, modelInstance: ModelContract) {
  /**
   * Return string or missing values as it is. If `auto` is set to true on
   * the column, then the hook will always initialize the date
   */
  if (typeof (value) === 'string' || !value) {
    return value
  }

  const model = modelInstance.constructor as ModelConstructorContract
  const modelName = model.name
  const dateTimeFormat = model.query(modelInstance.options).client.dialect.dateTimeFormat

  /**
   * Format luxon instances to SQL formatted date
   */
  if (value instanceof DateTime) {
    if (!value.isValid) {
      throw new Exception(
        `Invalid value for "${modelName}.${attributeName}". ${value.invalidReason}`,
        500,
        'E_INVALID_DATETIME_COLUMN_VALUE',
      )
    }

    return value.toFormat(dateTimeFormat)
  }

  /**
   * Anything else if not an acceptable value for date column
   */
  throw new Exception(
    `The value for "${modelName}.${attributeName}" must be an instance of "luxon.DateTime"`,
    500,
    'E_INVALID_DATETIME_COLUMN_VALUE',
  )
}

/**
 * Consume database return value and convert it to an instance of luxon.DateTime
 */
function consumeDateTimeColumn (value: any, attributeName: string, modelInstance: ModelContract) {
  /**
   * Bypass null columns
   */
  if (!value) {
    return value
  }

  /**
   * Convert from string
   */
  if (typeof (value) === 'string') {
    return DateTime.fromISO(value)
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
  throw new Exception(
    `Cannot format "${modelName}.${attributeName}" ${typeof(value)} value to an instance of "luxon.DateTime"`,
    500,
    'E_INVALID_DATETIME_COLUMN_VALUE',
  )
}

/**
 * A hook to set the luxon date time when it's missing on the date or
 * datetime columns and `auto` is set to true.
 *
 * The hook is meant to be used with both `date` and `datetime` columns,
 * since it's not formatting any dates.
 */
function setDateIfMissingHook (modelInstance: ModelContract) {
  const model = modelInstance.constructor as ModelConstructorContract
  model.$columnsDefinitions.forEach((column, attributeName) => {
    const columnType = column.meta?.type

    /**
     * Return early when not dealing with date time columns
     */
    if (!columnType || !DATE_TIME_TYPES[columnType]) {
      return
    }

    /**
     * Always update the date when `autoUpdate` is on
     */
    if (column.meta.autoUpdate) {
      modelInstance[attributeName] = DateTime.local()
      return
    }

    /**
     * Set the value when autoCreate is on and value is missing
     */
    if (!modelInstance[attributeName] && column.meta.autoCreate) {
      modelInstance[attributeName] = DateTime.local()
    }
  })
}

/**
 * Decorator to define a new date column
 */
export const dateColumn: DateColumnDecorator = (options?) => {
  return function decorateAsColumn (target, property) {
    const Model = target.constructor as ModelConstructorContract
    Model.boot()

    const normalizedOptions = Object.assign({
      prepare: prepareDateColumn,
      consume: consumeDateColumn,
      meta: {},
    }, options)

    /**
     * Type always has to be a date
     */
    normalizedOptions.meta.type = DATE_TIME_TYPES.date
    normalizedOptions.meta.autoCreate = normalizedOptions.autoCreate === undefined
      ? false
      : normalizedOptions.autoCreate
    normalizedOptions.meta.autoUpdate = normalizedOptions.autoUpdate === undefined
      ? false
      : normalizedOptions.autoUpdate

    Model.$addColumn(property, normalizedOptions)

    /**
     * Set hook when not already set
     */
    if (!Model['hooks'].has('before', 'save', setDateIfMissingHook)) {
      Model.before('save', setDateIfMissingHook)
    }
  }
}

/**
 * Decorator to define a new date time column
 */
export const dateTimeColumn: DateTimeColumnDecorator = (options?) => {
  return function decorateAsColumn (target, property) {
    const Model = target.constructor as ModelConstructorContract
    Model.boot()

    const normalizedOptions = Object.assign({
      prepare: prepareDateTimeColumn,
      consume: consumeDateTimeColumn,
      meta: {},
    }, options)

    /**
     * Type always has to be a datetime
     */
    normalizedOptions.meta.type = DATE_TIME_TYPES.datetime
    normalizedOptions.meta.autoCreate = normalizedOptions.autoCreate === undefined
      ? false
      : normalizedOptions.autoCreate
    normalizedOptions.meta.autoUpdate = normalizedOptions.autoUpdate === undefined
      ? false
      : normalizedOptions.autoUpdate

    Model.$addColumn(property, normalizedOptions)

    /**
     * Set hook when not already set
     */
    if (!Model['hooks'].has('before', 'save', setDateIfMissingHook)) {
      Model.before('save', setDateIfMissingHook)
    }
  }
}
