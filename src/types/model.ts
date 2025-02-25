/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { JSONTypes, Prettify } from './common.js'
import type { BaseModel } from '../orm/model.js'

/**
 * Defines a value object that can be casted
 */
export interface CanBeCasted {
  /**
   * Convert database return value to a JavaScript data-type. For example:
   * You can convert the string representation of BigInt from database
   * to a JavaScript BigInt value type.
   */
  consume(value: any, attribute: string, model: BaseModel): any
}

/**
 * Defines a value object that can be serialized
 */
export interface CanBeSerialized {
  /**
   * Define custom logic to serialize a value to its JSON representation.
   * The result value must always be a JSON compatible data-type.
   */
  serialize(value: any, property: string, model: BaseModel): JSONTypes
}

/**
 * Helper function to extract public properties of a class. The
 * helper ignores functions and the properties from the
 * BaseModel.
 */
export type GetInstanceProperties<Model extends BaseModel> = Prettify<
  Pick<
    Model,
    {
      [K in keyof Model]: Model[K] extends Function ? never : K extends keyof BaseModel ? never : K
    }[keyof Model]
  >
>

/**
 * Representation of a Lucid model attribute. A database
 * column is represented as an attribute.
 */
export type AttributeOptions = {
  /**
   * Name of the attribute inside the database
   */
  columnName: string

  /**
   * The name to be used when model is serialized to JSON. Setting
   * it to null will remove the attribute from the serialized
   * output
   */
  serializeAs: string | null

  /**
   * Is the primary key
   */
  isPrimary: boolean

  /**
   * Any additional metadata to attach to the attribute
   */
  meta?: any

  /**
   * Provide the value that should be inserted or updated inside the
   * database. This option is kept for legacy reasons. Instead we
   * recommend using ValueObjects.
   */
  prepare?: (value: any, attribute: string, model: BaseModel) => any

  /**
   * A flag to know if the attribute has a getter on the model.
   */
  readonly hasGetter: boolean

  /**
   * A flag to know if the attribute has a setter on the model.
   */
  readonly hasSetter: boolean
} & Partial<CanBeCasted> &
  Partial<CanBeSerialized>

/**
 * Representation of a computed property.
 */
export type ComputedOptions = {
  /**
   * The name to be used when model is serialized to JSON. Setting
   * it to null will remove the property from the serialized
   * output
   */
  serializeAs: string | null

  /**
   * Any additional metadata to attach to the property
   */
  meta?: any
} & Partial<CanBeSerialized>

/**
 * @deprecated
 * Instead use {@link AttributeOptions}
 */
export type ColumnOptions = AttributeOptions
