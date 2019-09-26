/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import pluralize from 'pluralize'
import { isObject, snakeCase } from 'lodash'
import { Exception } from '@poppinss/utils'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import {
  CacheNode,
  ColumnNode,
  ModelObject,
  ModelOptions,
  ComputedNode,
  ModelContract,
  AdapterContract,
  BaseRelationNode,
  RelationContract,
  AvailableRelations,
  ThroughRelationNode,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

import { proxyHandler } from './proxyHandler'
import { HasOne } from '../Relations/HasOne'

function StaticImplements<T> () {
  return (_t: T) => {}
}

/**
 * Abstract class to define fully fledged data models
 */
@StaticImplements<ModelConstructorContract>()
export class BaseModel implements ModelContract {
  /**
   * The adapter to be used for persisting and fetching data
   */
  public static $adapter: AdapterContract

  /**
   * Primary key is required to build relationships across models
   */
  public static $primaryKey: string

  /**
   * Whether or not the model has been booted. Booting the model initializes it's
   * static properties. Base models must not be initialized.
   */
  public static $booted: boolean

  /**
   * A set of properties marked as computed. Computed properties are included in
   * the `toJSON` result, else they behave the same way as any other instance
   * property.
   */
  public static $computed: Map<string, ComputedNode>

  /**
   * Columns makes it easier to define extra props on the model
   * and distinguish them with the attributes to be sent
   * over to the adapter
   */
  public static $columns: Map<string, ColumnNode>

  /**
   * Registered relationships for the given model
   */
  public static $relations: Map<string, RelationContract>

  /**
   * Whether or not to rely on database to return the primaryKey
   * value. If this is set to false, then the user must provide
   * the `$primaryKeyValue` themselves.
   */
  public static $increments: boolean

  /**
   * The name of database table. It is auto generated from the model name, unless
   * specified
   */
  public static $table: string

  /**
   * Refs are helpful of autocompleting the model props
   */
  public static $refs: any

  /**
   * A custom connection to use for queries. The connection defined on
   * query builder is preferred over the model connection
   */
  public static $connection?: string

  /**
   * Mappings are required, so that we can quickly lookup
   * casting names for columns.
   */
  private static _mappings: {
    cast: Map<string, string>,
  }

  /**
   * Returns the model query instance for the given model
   */
  public static query (options?: ModelOptions): any {
    return this.$adapter.query(this, options)
  }

  /**
   * Create a model instance from the adapter result. The result value must
   * be a valid object, otherwise `null` is returned.
   */
  public static $createFromAdapterResult (
    adapterResult: ModelObject,
    sideloadAttributes?: ModelObject,
    options?: ModelOptions,
  ): any | null {
    if (typeof (adapterResult) !== 'object' || Array.isArray(adapterResult)) {
      return null
    }

    const instance = new this()
    instance.$consumeAdapterResult(adapterResult, sideloadAttributes)
    instance.$hydrateOriginals()
    instance.$persisted = true
    instance.$isLocal = false

    if (options) {
      instance.$options = options
    }

    return instance
  }

  /**
   * Creates an array of models from the adapter results. The `adapterResults`
   * must be an array with valid Javascript objects.
   *
   * 1. If top level value is not an array, then an empty array is returned.
   * 2. If row is not an object, then it will be ignored.
   */
  public static $createMultipleFromAdapterResult<T extends ModelConstructorContract> (
    this: T,
    adapterResults: ModelObject[],
    sideloadAttributes?: ModelObject,
    options?: any,
  ): InstanceType<T>[] {
    if (!Array.isArray(adapterResults)) {
      return []
    }

    return adapterResults.reduce((models, row) => {
      if (isObject(row)) {
        models.push(this['$createFromAdapterResult'](row, sideloadAttributes, options))
      }
      return models
    }, []) as InstanceType<T>[]
  }

  /**
   * Boot the model
   */
  public static $boot () {
    if (this.$booted) {
      return
    }

    this.$booted = true
    this.$primaryKey = this.$primaryKey || 'id'

    Object.defineProperty(this, '$columns', { value: new Map() })
    Object.defineProperty(this, '$computed', { value: new Map() })
    Object.defineProperty(this, '$relations', { value: new Map() })
    Object.defineProperty(this, '_mappings', {
      value: {
        cast: new Map(),
      },
    })

    this.$increments = this.$increments === undefined ? true : this.$increments
    this.$table = this.$table === undefined ? pluralize(snakeCase(this.name)) : this.$table
  }

  /**
   * Define a new column on the model. This is required, so that
   * we differentiate between plain properties vs model attributes.
   */
  public static $addColumn (name: string, options: Partial<ColumnNode>) {
    const descriptor = Object.getOwnPropertyDescriptor(this.prototype, name)

    const column: ColumnNode = {
      castAs: options.castAs || snakeCase(name),
      serializeAs: options.serializeAs || snakeCase(name),
      nullable: options.nullable || false,
      primary: options.primary || false,
      hasGetter: !!(descriptor && descriptor.get),
      hasSetter: !!(descriptor && descriptor.set),
    }

    /**
     * Set column as the primary column, when `primary` is to true
     */
    if (column.primary) {
      this.$primaryKey = name
    }

    this.$columns.set(name, column)
    this._mappings.cast.set(column.castAs!, name)
   }

  /**
   * Returns a boolean telling if column exists on the model
   */
  public static $hasColumn (name: string): boolean {
    return this.$columns.has(name)
  }

  /**
   * Returns the column for a given name
   */
  public static $getColumn (name: string): ColumnNode | undefined {
    return this.$columns.get(name)
  }

  /**
   * Adds a computed node
   */
  public static $addComputed (name: string, options: Partial<ComputedNode>) {
    const column: ComputedNode = {
      serializeAs: options.serializeAs || name,
    }
    this.$computed.set(name, column)
  }

  /**
   * Find if some property is marked as computed
   */
  public static $hasComputed (name: string): boolean {
    return this.$computed.has(name)
  }

  /**
   * Get computed node
   */
  public static $getComputed (name: string): ComputedNode | undefined {
    return this.$computed.get(name)
  }

  /**
   * Adds a relationship
   */
  public static $addRelation (
    name: string,
    type: AvailableRelations,
    options: Partial<BaseRelationNode | ThroughRelationNode>,
  ) {
    switch (type) {
      case 'hasOne':
        this.$relations.set(name, new HasOne(name, options, this))
    }
  }

  /**
   * Find if some property is marked as a relation or not
   */
  public static $hasRelation (name: string): boolean {
    return this.$relations.has(name)
  }

  /**
   * Returns relationship node for a given relation
   */
  public static $getRelation (name: string): RelationContract | undefined {
    return this.$relations.get(name)
  }

  /**
   * Returns a fresh instance of model by applying attributes
   * to the model instance
   */
  public static create<T extends ModelConstructorContract> (
    this: T,
    values: ModelObject,
  ): InstanceType<T> {
    const instance = new this()
    instance.fill(values)
    return instance as InstanceType<T>
  }

  /**
   * Find model instance using a key/value pair
   */
  public static async findBy<T extends ModelConstructorContract> (
    this: T,
    key: string,
    value: any,
    options?: any,
  ) {
    return this.query(options).where(key, value).first()
  }

  /**
   * Create a array of model instances from the adapter result
   */
  public static async findAll <T extends ModelConstructorContract> (
    this: T,
    options?: any,
  ) {
    return this.query(options).exec()
  }

  constructor () {
    return new Proxy(this, proxyHandler)
  }

  /**
   * When `fill` method is called, then we may have a situation where it
   * removed the values which exists in `original` and hence the dirty
   * diff has to do a negative diff as well
   */
  private _fillInvoked: boolean = false

  /**
   * A copy of cached getters
   */
  private _cachedGetters: { [key: string]: CacheNode } = {}

  /**
   * Raises exception when mutations are performed on a delete model
   */
  private _ensureIsntDeleted () {
    if (this.$isDeleted) {
      throw new Exception('Cannot mutate delete model instance', 500, 'E_MODEL_DELETED')
    }
  }

  /**
   * Preparing the object to be sent to the adapter. We need
   * to create the object with the property names to be
   * used by the adapter.
   */
  protected $prepareForAdapter (attributes: ModelObject) {
    const Model = this.constructor as typeof BaseModel
    return Object.keys(attributes).reduce((result, key) => {
      result[Model.$getColumn(key)!.castAs] = attributes[key]
      return result
    }, {})
  }

  /**
   * A copy of attributes that will be sent over to adapter
   */
  public $attributes: ModelObject = {}

  /**
   * Original represents the properties that already has been
   * persisted or loaded by the adapter.
   */
  public $original: ModelObject = {}

  /**
   * Preloaded relationships on the model instance
   */
  public $preloaded: { [relation: string]: ModelContract | ModelContract[] } = {}

  /**
   * Sideloaded are dynamic properties set on the model instance, which
   * are not serialized and neither casted for adapter calls.
   *
   * This is helpful when you want to add dynamic meta data to the model
   * and it's children as well.
   *
   * The difference between [[$extras]] and [[$sideloaded]] is:
   *
   * - Extras can be different for each model instance
   * - Extras are not shared down the hierarchy (example relationships)
   * - Sideloaded are shared across multiple model instances created via `$createMultipleFromAdapterResult`.
   * - Sideloaded are passed to the relationships as well.
   */
  public $sideloaded: ModelObject = {}

  /**
   * Extras are dynamic properties set on the model instance, which
   * are not serialized and neither casted for adapter calls.
   *
   * This is helpful when adapter wants to load some extra data conditionally
   * and that data must not be persisted back the adapter.
   */
  public $extras: ModelObject = {}

  /**
   * Persisted means the model has been persisted with the adapter. This will
   * also be true, when model instance is created as a result of fetch
   * call from the adapter.
   */
  public $persisted: boolean = false

  /**
   * Once deleted the model instance cannot make calls to the adapter
   */
  public $isDeleted: boolean = false

  /**
   * Custom options defined on the model instance that are
   * passed to the adapter
   */
  public $options: ModelOptions

  /**
   * Returns the value of primary key. The value must be
   * set inside attributes object
   */
  public get $primaryKeyValue (): any | undefined {
    const model = this.constructor as typeof BaseModel
    const column = model.$getColumn(model.$primaryKey)

    if (column && column.hasGetter) {
      return this[model.$primaryKey]
    }

    return this.$getAttribute(model.$primaryKey)
  }

  /**
   * Opposite of [[this.$persisted]]
   */
  public get $isNew (): boolean {
    return !this.$persisted
  }

  /**
   * `$isLocal` tells if the model instance was created locally vs
   * one generated as a result of fetch call from the adapter.
   */
  public $isLocal: boolean = true

  /**
   * Returns dirty properties of a model by doing a diff
   * between original values and current attributes
   */
  public get $dirty (): any {
    const processedKeys: string[] = []

    /**
     * Do not compute diff, when model has never been persisted
     */
    if (!this.$persisted) {
      return this.$attributes
    }

    const result = Object.keys(this.$attributes).reduce((result, key) => {
      const value = this.$attributes[key]
      const originalValue = this.$original[key]

      if (originalValue !== value) {
        result[key] = value
      }

      if (this._fillInvoked) {
        processedKeys.push(key)
      }

      return result
    }, {})

    /**
     * Find negative diff if fill was invoked, since we may have removed values
     * that exists in originals
     */
    if (this._fillInvoked) {
      Object.keys(this.$original)
        .filter((key) => !processedKeys.includes(key))
        .forEach((key) => {
          result[key] = null
        })
    }

    return result
  }

  /**
   * Finding if model is dirty with changes or not
   */
  public get $isDirty () {
    return Object.keys(this.$dirty).length > 0
  }

  /**
   * Set attribute
   */
  public $setAttribute (key: string, value: any) {
    this._ensureIsntDeleted()
    this.$attributes[key] = value
  }

  /**
   * Get value of attribute
   */
  public $getAttribute (key: string): any {
    return this.$attributes[key]
  }

  /**
   * Returns the attribute value from the cache which was resolved by
   * the mutated by a getter. This is done to avoid re-mutating
   * the same attribute value over and over again.
   */
  public $getAttributeFromCache (key: string, callback: CacheNode['getter']): any {
    const original = this.$getAttribute(key)
    const cached = this._cachedGetters[key]

    /**
     * Return the resolved value from cache when cache original is same
     * as the attribute value
     */
    if (cached && cached.original === original) {
      return cached.resolved
    }

    /**
     * Re-resolve the value from the callback
     */
    const resolved = callback(original)

    if (!cached) {
      /**
       * Create cache entry
       */
      this._cachedGetters[key] = { getter: callback, original, resolved }
    } else {
      /**
       * Update original and resolved keys
       */
      this._cachedGetters[key].original = original
      this._cachedGetters[key].resolved = resolved
    }

    return resolved
  }

  /**
   * Returns the related model or default value when model is missing
   */
  public $getRelated<K extends keyof this> (key: K, defaultValue: any): any {
    return this.$preloaded[key as string] || defaultValue
  }

  /**
   * Sets the related data on the model instance. The method internally handles
   * `one to one` or `many` relations
   */
  public $setRelated<K extends keyof this> (key: K, models: this[K]) {
    const Model = this.constructor as typeof BaseModel
    const relation = Model.$relations.get(key as string)

    /**
     * Ignore when relation is not defined
     */
    if (!relation) {
      return
    }

    /**
     * Create multiple for `hasMany` and one for `belongsTo` and `hasOne`
     */
    if (['hasMany', 'manyToMany', 'hasManyThrough'].includes(relation.type)) {
      if (!Array.isArray(models)) {
        throw new Error('Pass array please')
      }
      this.$preloaded[key as string] = models
    } else {
      this.$preloaded[key as string] = models as unknown as ModelContract
    }
  }

  /**
   * Persisting the model with adapter insert/update results. This
   * method is invoked after adapter insert/update action.
   */
  public $consumeAdapterResult (adapterResult: ModelObject, sideloadAttributes?: ModelObject) {
    const Model = this.constructor as typeof BaseModel

    /**
     * Merging sideloaded attributes with the existing sideloaded values
     * on the model instance
     */
    if (sideloadAttributes) {
      this.$sideloaded = Object.assign({}, this.$sideloaded, sideloadAttributes)
    }

    /**
     * Merge result of adapter with the attributes. This enables
     * the adapter to hydrate models with properties generated
     * as a result of insert or update
     */
    if (isObject(adapterResult)) {
      Object.keys(adapterResult).forEach((key) => {
        /**
         * The adapter will return the values as per `normalizeAs` key. We
         * need to pull the actual column name for that key and then
         * set the value.
         *
         * Key/value that are not part of defined columns will be ignored
         * silently.
         */
        const columnName = Model._mappings.cast.get(key)
        if (columnName) {
          this.$setAttribute(columnName, adapterResult[key])
          return
        }

        /**
         * If key is defined as a relation, then ignore it, since one
         * must pass a qualified model to `this.$setRelated()`
         */
        if (Model.$relations.has(key)) {
          return
        }

        this.$extras[key] = adapterResult[key]
      })
    }
  }

  /**
   * Sync originals with the attributes. After this `isDirty` will
   * return false
   */
  public $hydrateOriginals () {
    this.$original = Object.assign({}, this.$attributes)
  }

  /**
   * Set bulk attributes on the model instance. Setting relationships via
   * fill isn't allowed, since we disallow setting relationships
   * locally
   */
  public fill (values: ModelObject) {
    this.$attributes = {}
    this.merge(values)
    this._fillInvoked = true
  }

  /**
   * Merge bulk attributes with existing attributes.
   */
  public merge (values: ModelObject) {
    const Model = this.constructor as typeof BaseModel

    /**
     * Merge result of adapter with the attributes. This enables
     * the adapter to hydrate models with properties generated
     * as a result of insert or update
     */
    if (isObject(values)) {
      Object.keys(values).forEach((key) => {
        if (Model.$hasColumn(key)) {
          this[key] = values[key]
          return
        }

        this.$extras[key] = values[key]
      })
    }
  }

  /**
   * Perform save on the model instance to commit mutations.
   */
  public async save () {
    this._ensureIsntDeleted()
    const Model = this.constructor as typeof BaseModel

    /**
     * Persit the model when it's not persisted already
     */
    if (!this.$persisted) {
      await Model.$adapter.insert(this, this.$prepareForAdapter(this.$attributes))
      this.$hydrateOriginals()
      this.$persisted = true
      return
    }

    const dirty = this.$dirty

    /**
     * Do not issue updates when model doesn't have any mutations
     */
    if (!Object.keys(dirty).length) {
      return
    }

    /**
     * Perform update
     */
    await Model.$adapter.update(this, this.$prepareForAdapter(dirty))
    this.$hydrateOriginals()
    this.$persisted = true
  }

  /**
   * Perform delete by issuing a delete request on the adapter
   */
  public async delete () {
    this._ensureIsntDeleted()
    const Model = this.constructor as typeof BaseModel
    await Model.$adapter.delete(this)
    this.$isDeleted = true
  }

  /**
   * Converting model to it's JSON representation
   */
  public toJSON () {
    const Model = this.constructor as typeof BaseModel
    const results = {}

    Model.$computed.forEach((value, key) => {
      results[value.serializeAs] = this[key]
    })

    Object.keys(this.$attributes).forEach((key) => {
      results[Model.$getColumn(key)!.serializeAs] = this.$attributes[key]
    })

    Object.keys(this.$preloaded).forEach((key) => {
      const relationValue = this.$preloaded[key]
      results[Model.$getRelation(key)!.serializeAs] = Array.isArray(relationValue)
        ? relationValue.map((one) => one.toJSON())
        : relationValue.toJSON()
    })

    return results
  }

  /**
   * Returns the query for `insert`, `update` or `delete` actions.
   * Since the query builder for these actions are not exposed to
   * the end user, this method gives a way to compose queries.
   */
  public $getQueryFor (
    action: 'insert' | 'update' | 'delete',
    client: QueryClientContract,
  ): any {
    const modelConstructor = this.constructor as typeof BaseModel

    /**
     * Returning insert query for the inserts
     */
    if (action === 'insert') {
      const insertQuery = client.insertQuery().table(modelConstructor.$table)

      if (modelConstructor.$increments) {
        insertQuery.returning(modelConstructor.$primaryKey)
      }
      return insertQuery
    }

    /**
     * Returning generic query builder for rest of the queries
     */
    return client
      .query()
      .from(modelConstructor.$table)
      .where(modelConstructor.$primaryKey, this.$primaryKeyValue)
  }
}
