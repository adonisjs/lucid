/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { defineStaticProperty } from '@poppinss/utils'
import type {
  CanBeCasted,
  ComputedOptions,
  AttributeOptions,
  GetInstanceProperties,
} from '../types/model.js'
import { isObject } from '../helpers.js'
import { proxyHandler } from './proxy_handler.js'

export class BaseModel {
  /**
   * When enabled, accessing a missing property on the model
   * instance will throw an error.
   */
  static preventAccessingMissingAttributes: boolean = false

  /**
   * The name of the primary key attribute.
   */
  static primaryKey: string

  /**
   * Whether the model has been booted. Booting the model initializes its
   * static properties.
   */
  static booted: boolean

  /**
   * Collection of model attributes. Every attribute has
   * a corresponding database column.
   */
  static $attributesMap: Map<string, AttributeOptions>

  /**
   * Collection of computed properties. Computed properties are added
   * for serialization purposes. However, it is recommended to use
   * HTTP resources over computed properties for better type-safety.
   */
  static $computedPropertiesMap: Map<string, ComputedOptions>

  /**
   * Collection of casts defined for the model properties. Casts
   * are invoked when the model is hydrated from the adapter
   * results.
   */
  static $castsMap: Map<string, CanBeCasted>

  /**
   * Collection of property names used by different layers of
   * the model.
   */
  static $keysMap: {
    /**
     * An object mapping database column names to model attributes
     */
    columnsToAttributes: Record<string, any>

    /**
     * An object mapping model attributes to database column names
     */
    attributesToColumns: Record<string, any>
  }

  /**
   * Define a static property on the model. This method allows inherting
   * the value of the given property from the parent model.
   *
   * @example
   * ```ts
   * // The following function call will copy existing $keys
   * // from the parent model (if exists).
   * User.defineProperty('$keys', new Map(), 'inherit')
   *
   * // The following function call will define an empty map
   * // for the $keys.
   * User.defineProperty('$keys', new Map(), 'define')
   * ```
   */
  static defineProperty<Model extends typeof BaseModel, Prop extends keyof Model>(
    this: Model,
    propertyName: Prop,
    defaultValue: Model[Prop],
    strategy: 'inherit' | 'define' | ((value: Model[Prop]) => Model[Prop])
  ) {
    defineStaticProperty(this, propertyName, {
      initialValue: defaultValue,
      strategy: strategy,
    })
  }

  /**
   * Boot the model
   */
  static boot() {
    /**
     * Define the property when not defined on self
     */
    if (!this.hasOwnProperty('booted')) {
      this.booted = false
    }

    /**
     * Return when already booted
     */
    if (this.booted === true) {
      return
    }

    this.booted = true

    /**
     * Defining static properties
     */
    this.defineProperty('primaryKey', 'id', 'inherit')
    this.defineProperty('preventAccessingMissingAttributes', false, 'inherit')
    this.defineProperty('$attributesMap', new Map(), 'inherit')
    this.defineProperty('$computedPropertiesMap', new Map(), 'inherit')
    this.defineProperty('$castsMap', new Map(), 'inherit')
    this.defineProperty(
      '$keysMap',
      {
        attributesToColumns: {},
        columnsToAttributes: {},
      },
      (inheritedValue) => {
        return {
          attributesToColumns: Object.assign({}, inheritedValue.attributesToColumns),
          columnsToAttributes: Object.assign({}, inheritedValue.columnsToAttributes),
        }
      }
    )
  }

  /**
   * Define a new attribute for the model. Attributes are model
   * properties backed by a database column.
   */
  static defineAttribute(
    name: string,
    options: Partial<Omit<AttributeOptions, 'hasGetter' | 'hasSetter'>>
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(this.prototype, name)

    const attribute: AttributeOptions = {
      isPrimary: options.isPrimary || false,
      columnName: options.columnName || name,
      hasGetter: !!(descriptor && descriptor.get),
      hasSetter: !!(descriptor && descriptor.set),
      serializeAs: options.serializeAs ?? name,
      meta: options.meta,

      /**
       * The following options can be replaced by a value object.
       */
      serialize: options.serialize,
      prepare: options.prepare,
      consume: options.consume,
    }

    if (attribute.isPrimary) {
      this.primaryKey = name
    }

    this.$attributesMap.set(name, attribute)
    this.$keysMap.attributesToColumns[name] = attribute.columnName
    this.$keysMap.columnsToAttributes[attribute.columnName] = name
    return attribute
  }

  /**
   * Returns a boolean telling if the attribute exists on the model
   */
  static hasAttribute(name: string): boolean {
    return this.$attributesMap.has(name)
  }

  /**
   * Returns the attribute's metadata
   */
  static getAttribute(name: string): AttributeOptions | undefined {
    return this.$attributesMap.get(name)
  }

  /**
   * Register a caster for a given model property.
   */
  static defineCast(propertyName: string, valueObject: CanBeCasted) {
    this.$castsMap.set(propertyName, valueObject)
  }

  /**
   * Returns a boolean telling if casts for a given property exists
   */
  static hasCast(propertyName: string): boolean {
    return this.$castsMap.has(propertyName)
  }

  /**
   * Returns the casts value object
   */
  static getCast(propertyName: string): CanBeCasted | undefined {
    return this.$castsMap.get(propertyName)
  }

  /**
   * Mark model property as a computed property. Computed properties
   * are serialized by default
   */
  static defineComputed(name: string, options: Partial<ComputedOptions>) {
    const computed: ComputedOptions = {
      serializeAs: options.serializeAs || name,
      meta: options.meta,
    }
    this.$computedPropertiesMap.set(name, computed)
    return computed
  }

  /**
   * Returns a boolean telling if the property has been marked
   * as computed
   */
  static hasComputed(name: string): boolean {
    return this.$computedPropertiesMap.has(name)
  }

  /**
   * Returns the computed property metadata
   */
  static getComputed(name: string): ComputedOptions | undefined {
    return this.$computedPropertiesMap.get(name)
  }

  /**
   * Attributes refers to model properties that are persisted
   * to the database.
   */
  $attributes: Record<string, any> = {}

  /**
   * Attributes fetched from the database. Original attributes are
   * kept to find dirty (aka changed) properties.
   */
  $original: Record<string, any> = {}

  /**
   * Extras are dynamic properties set on the model instance which
   * does not have a corresponding model property.
   */
  $extras: Record<string, any> = {}

  constructor() {
    return new Proxy(this, proxyHandler)
  }

  /**
   * Returns the value of an attribute from the $attributes
   * object
   */
  getAttribute(key: string): any {
    return this.$attributes[key]
  }

  /**
   * Sets the value of an attributes within the $attributes
   * object
   */
  setAttribute(key: string, value: any) {
    this.$attributes[key] = value
  }

  /**
   * Hydrates the model instance with adapter results. A model can be
   * hydrated multiple times with partial results in each phase.
   *
   * Following are the steps performed during hydration.
   *
   * - If the key from result is defined as an attribute, then it will be casted
   *   either via the "decorator.consume" or the "cast.consume" method. Also,
   *   the db column name will be renamed to the model property.
   *   A copy of the same value will be kept under the "originals" object for
   *   tracking modifications.
   *
   * - If the key from result is not an attribute but a regular model property,
   *   then it will be casted via the "cast.consume" method and set as the
   *   model property.
   *
   * - Otherwise, the value will be casted via the "cast.consume" method and
   *   moved to the "$extras" object.
   *
   * @example
   * ```ts
   * const user = new User()
   * const dbResult = {
   *   first_name: 'Harminder',
   *   last_name: 'Virk',
   * }
   *
   * user.hydrateUsingAdapterResults(dbResult)
   * ```
   */
  hydrateUsingAdapterResults(adapterResult: Record<string, any>) {
    const Model = this.constructor as typeof BaseModel
    if (!isObject(adapterResult)) {
      return
    }

    Object.keys(adapterResult).forEach((key) => {
      const attributeName = Model.$keysMap.columnsToAttributes[key]

      /**
       * Property is an attribute therefore it must go through the following
       * steps.
       *
       * - Invoke "consume" when defined via the decorator
       * - Else invoke "consume" from the castsMap
       * - Set model property
       * - Set original value
       */
      if (attributeName) {
        let value = adapterResult[key]
        let originalValue = adapterResult[key]

        const attribute = Model.getAttribute(attributeName)!
        const cast = Model.$castsMap.get(attributeName)

        if (typeof attribute.consume === 'function') {
          value = attribute.consume(value, attributeName, this)
          originalValue = attribute.consume(originalValue, attributeName, this)
        } else if (cast) {
          value = cast.consume(value, attributeName, this)
          originalValue = cast.consume(originalValue, attributeName, this)
        }

        ;(this as any)[attributeName] = value
        this.$original[attributeName] = originalValue
        return
      }

      /**
       * Cast the value before setting it on the model or the
       * $extras object.
       */
      let value = adapterResult[key]
      const cast = Model.$castsMap.get(key)
      if (cast) {
        value = cast.consume(value, key, this)
      }

      /**
       * Key is not an attribute, but a regular model instance property.
       */
      if (this.hasOwnProperty(key)) {
        ;(this as any)[key] = value
        return
      }

      /**
       * Unknown properties are moved to the "$extras" object
       */
      this.$extras[key] = value
    })
  }

  /**
   * Converts the model instance to a plain JavaScript object. The
   * return value includes all the instance properties excluding
   * the properties inherited from the "BaseModel".
   *
   * @note
   * The return type of "toObject" method assumes the model is fully
   * hydrated and cannot account for partially hydrated models at
   * the type-safety level.
   *
   * @note
   * Getters are not evaluated unless they are marked at attributes.
   * If you want to include certain getters, you can self append
   * them to the final result.
   *
   * @example
   * ```ts
   * user.toObject()
   * ```
   */
  toObject(): GetInstanceProperties<this> {
    const Model = this.constructor as typeof BaseModel
    const keysToIgnore = Reflect.ownKeys(new BaseModel())
    const keys = Array.from(
      new Set([...Reflect.ownKeys(this).concat(Object.keys(Model.$keysMap.attributesToColumns))])
    )

    return keys.reduce((result, key) => {
      if (!keysToIgnore.includes(key)) {
        /**
         * Ensure the key exists on the model instance before reading its
         * value to avoid "preventAccessingMissingAttributes" from raising
         * an error.
         */
        if (key in this) {
          ;(result as any)[key] = (this as any)[key]
        }
      }
      return result
    }, {} as GetInstanceProperties<this>)
  }
}
