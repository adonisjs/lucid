/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import { DateTime } from 'luxon'
import { IocContract } from '@adonisjs/fold'
import { Exception } from '@poppinss/utils'
import { Hooks } from '@poppinss/hooks'

import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import {
  LucidRow,
  OrmConfig,
  CacheNode,
  LucidModel,
  EventsList,
  ModelObject,
  HooksHandler,
  ModelOptions,
  ColumnOptions,
  ComputedOptions,
  AdapterContract,
  ModelColumnOptions,
  ModelKeysContract,
  ModelAdapterOptions,
  ModelRelationOptions,
} from '@ioc:Adonis/Lucid/Model'

import {
  ModelRelations,
  RelationOptions,
  RelationshipsContract,
  ThroughRelationOptions,
  ManyToManyRelationOptions,
} from '@ioc:Adonis/Lucid/Relations'

import { Config } from '../Config'
import { ModelKeys } from '../ModelKeys'
import { Preloader } from '../Preloader'
import { HasOne } from '../Relations/HasOne'
import { proxyHandler } from './proxyHandler'
import { HasMany } from '../Relations/HasMany'
import { BelongsTo } from '../Relations/BelongsTo'
import { ManyToMany } from '../Relations/ManyToMany'
import { HasManyThrough } from '../Relations/HasManyThrough'
import { ensureRelation, isObject, ensureValue, managedTransaction } from '../../utils'

const MANY_RELATIONS = ['hasMany', 'manyToMany', 'hasManyThrough']
const DATE_TIME_TYPES = {
  date: 'date',
  datetime: 'datetime',
}

function StaticImplements<T> () {
  return (_t: T) => {}
}

/**
 * Abstract class to define fully fledged data models
 */
@StaticImplements<LucidModel>()
export class BaseModel implements LucidRow {
  /**
   * The adapter to be used for persisting and fetching data.
   *
   * NOTE: Adapter is a singleton and share among all the models, unless
   * a user wants to swap the adapter for a given model
   */
  public static $adapter: AdapterContract

  /**
   * Used to construct defaults for the model
   */
  public static $configurator: OrmConfig = Config

  /**
   * The container required to resolve hooks
   *
   * NOTE: Container is a singleton and share among all the models, unless
   * a user wants to swap the container for a given model
   */
  public static $container: IocContract

  /**
   * Primary key is required to build relationships across models
   */
  public static primaryKey: string

  /**
   * Whether or not the model has been booted. Booting the model initializes it's
   * static properties. Base models must not be initialized.
   */
  public static booted: boolean

  /**
   * Query scopes defined on the model
   */
  public static $queryScopes: any = {}

  /**
   * A set of properties marked as computed. Computed properties are included in
   * the `toJSON` result, else they behave the same way as any other instance
   * property.
   */
  public static $computedDefinitions: Map<string, ComputedOptions>

  /**
   * Columns makes it easier to define extra props on the model
   * and distinguish them with the attributes to be sent
   * over to the adapter
   */
  public static $columnsDefinitions: Map<string, ModelColumnOptions>

  /**
   * Registered relationships for the given model
   */
  public static $relationsDefinitions: Map<string, RelationshipsContract>

  /**
   * The name of database table. It is auto generated from the model name, unless
   * specified
   */
  public static table: string

  /**
   * A custom connection to use for queries. The connection defined on
   * query builder is preferred over the model connection
   */
  public static connection?: string

  /**
   * Storing model hooks
   */
  public static $hooks: Hooks

  /**
   * Keys mappings to make the lookups easy
   */
  public static $keys: {
    attributesToColumns: ModelKeysContract,
    attributesToSerialized: ModelKeysContract,
    columnsToAttributes: ModelKeysContract,
    columnsToSerialized: ModelKeysContract,
    serializedToColumns: ModelKeysContract,
    serializedToAttributes: ModelKeysContract,
  }

  /**
   * Returns the model query instance for the given model
   */
  public static query (options?: ModelAdapterOptions): any {
    return this.$adapter.query(this, options)
  }

  /**
   * Create a model instance from the adapter result. The result value must
   * be a valid object, otherwise `null` is returned.
   */
  public static $createFromAdapterResult (
    adapterResult: ModelObject,
    sideloadAttributes?: ModelObject,
    options?: ModelAdapterOptions,
  ): any | null {
    if (typeof (adapterResult) !== 'object' || Array.isArray(adapterResult)) {
      return null
    }

    const instance = new this()
    instance.$consumeAdapterResult(adapterResult, sideloadAttributes)
    instance.$hydrateOriginals()

    instance.$setOptionsAndTrx(options)
    instance.$isPersisted = true
    instance.$isLocal = false

    return instance
  }

  /**
   * Creates an array of models from the adapter results. The `adapterResults`
   * must be an array with valid Javascript objects.
   *
   * 1. If top level value is not an array, then an empty array is returned.
   * 2. If row is not an object, then it will be ignored.
   */
  public static $createMultipleFromAdapterResult<T extends LucidModel> (
    this: T,
    adapterResults: ModelObject[],
    sideloadAttributes?: ModelObject,
    options?: ModelAdapterOptions,
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
   * Define a new column on the model. This is required, so that
   * we differentiate between plain properties vs model attributes.
   */
  public static $addColumn (name: string, options: Partial<ColumnOptions>) {
    const descriptor = Object.getOwnPropertyDescriptor(this.prototype, name)

    const column: ModelColumnOptions = {
      isPrimary: options.isPrimary || false,
      columnName: options.columnName || this.$configurator.getColumnName(this, name),
      hasGetter: !!(descriptor && descriptor.get),
      hasSetter: !!(descriptor && descriptor.set),
      serializeAs: options.serializeAs !== undefined
        ? options.serializeAs
        : this.$configurator.getSerializeAsKey(this, name),
      serialize: options.serialize,
      prepare: options.prepare,
      consume: options.consume,
      meta: options.meta,
    }

    /**
     * Set column as the primary column, when `primary` is to true
     */
    if (column.isPrimary) {
      this.primaryKey = name
    }

    this.$columnsDefinitions.set(name, column)

    this.$keys.attributesToColumns.add(name, column.columnName)
    column.serializeAs && this.$keys.attributesToSerialized.add(name, column.serializeAs)

    this.$keys.columnsToAttributes.add(column.columnName, name)
    column.serializeAs && this.$keys.columnsToSerialized.add(column.columnName, column.serializeAs)

    column.serializeAs && this.$keys.serializedToAttributes.add(column.serializeAs, name)
    column.serializeAs && this.$keys.serializedToColumns.add(column.serializeAs, column.columnName)

    return column
  }

  /**
   * Returns a boolean telling if column exists on the model
   */
  public static $hasColumn (name: string): boolean {
    return this.$columnsDefinitions.has(name)
  }

  /**
   * Returns the column for a given name
   */
  public static $getColumn (name: string): ModelColumnOptions | undefined {
    return this.$columnsDefinitions.get(name)
  }

  /**
   * Adds a computed node
   */
  public static $addComputed (name: string, options: Partial<ComputedOptions>) {
    const computed: ComputedOptions = {
      serializeAs: options.serializeAs || name,
      meta: options.meta,
    }
    this.$computedDefinitions.set(name, computed)
    return computed
  }

  /**
   * Find if some property is marked as computed
   */
  public static $hasComputed (name: string): boolean {
    return this.$computedDefinitions.has(name)
  }

  /**
   * Get computed node
   */
  public static $getComputed (name: string): ComputedOptions | undefined {
    return this.$computedDefinitions.get(name)
  }

  /**
   * Register has one relationship
   */
  protected static $addHasOne (
    name: string,
    relatedModel: () => LucidModel,
    options: RelationOptions<ModelRelations>,
  ) {
    this.$relationsDefinitions.set(name, new HasOne(name, relatedModel, options, this))
  }

  /**
   * Register has many relationship
   */
  protected static $addHasMany (
    name: string,
    relatedModel: () => LucidModel,
    options: RelationOptions<ModelRelations>,
  ) {
    this.$relationsDefinitions.set(name, new HasMany(name, relatedModel, options, this))
  }

  /**
   * Register belongs to relationship
   */
  protected static $addBelongsTo (
    name: string,
    relatedModel: () => LucidModel,
    options: RelationOptions<ModelRelations>,
  ) {
    this.$relationsDefinitions.set(name, new BelongsTo(name, relatedModel, options, this))
  }

  /**
   * Register many to many relationship
   */
  protected static $addManyToMany (
    name: string,
    relatedModel: () => LucidModel,
    options: ManyToManyRelationOptions<ModelRelations>,
  ) {
    this.$relationsDefinitions.set(name, new ManyToMany(name, relatedModel, options, this))
  }

  /**
   * Register many to many relationship
   */
  protected static $addHasManyThrough (
    name: string,
    relatedModel: () => LucidModel,
    options: ThroughRelationOptions<ModelRelations>,
  ) {
    this.$relationsDefinitions.set(name, new HasManyThrough(name, relatedModel, options, this))
  }

  /**
   * Adds a relationship
   */
  public static $addRelation (
    name: string,
    type: ModelRelations['type'],
    relatedModel: () => LucidModel,
    options: ModelRelationOptions,
  ) {
    switch (type) {
      case 'hasOne':
        this.$addHasOne(name, relatedModel, options)
        break
      case 'hasMany':
        this.$addHasMany(name, relatedModel, options)
        break
      case 'belongsTo':
        this.$addBelongsTo(name, relatedModel, options)
        break
      case 'manyToMany':
        this.$addManyToMany(name, relatedModel, options as ManyToManyRelationOptions<ModelRelations>)
        break
      case 'hasManyThrough':
        this.$addHasManyThrough(name, relatedModel, options as ThroughRelationOptions<ModelRelations>)
        break
      default:
        throw new Error(`${type} is not a supported relation type`)
    }
  }

  /**
   * Find if some property is marked as a relation or not
   */
  public static $hasRelation (name: any): boolean {
    return this.$relationsDefinitions.has(name)
  }

  /**
   * Returns relationship node for a given relation
   */
  public static $getRelation (name: any): any {
    return this.$relationsDefinitions.get(name)!
  }

  /**
   * Boot the model
   */
  public static boot () {
    if (this.booted) {
      return
    }

    this.booted = true
    this.primaryKey = this.primaryKey || 'id'

    Object.defineProperty(this, '$keys', {
      value: {
        attributesToColumns: new ModelKeys(),
        attributesToSerialized: new ModelKeys(),
        columnsToAttributes: new ModelKeys(),
        columnsToSerialized: new ModelKeys(),
        serializedToColumns: new ModelKeys(),
        serializedToAttributes: new ModelKeys(),
      },
    })

    Object.defineProperty(this, '$columnsDefinitions', { value: new Map() })
    Object.defineProperty(this, '$computedDefinitions', { value: new Map() })
    Object.defineProperty(this, '$relationsDefinitions', { value: new Map() })

    Object.defineProperty(this, '$hooks', {
      value: new Hooks(this.$container.getResolver(undefined, 'modelHooks', 'App/Models/Hooks')),
    })

    this.table = this.table === undefined ? this.$configurator.getTableName(this) : this.table
  }

  /**
   * Register before hooks
   */
  public static before (event: EventsList, handler: HooksHandler<any, EventsList>) {
    this.$hooks.add('before', event, handler)
    return this
  }

  /**
   * Register after hooks
   */
  public static after (event: EventsList, handler: HooksHandler<any, EventsList>) {
    this.$hooks.add('after', event, handler)
    return this
  }

  /**
   * Returns a fresh persisted instance of model by applying
   * attributes to the model instance
   */
  public static async create (values: any, options?: ModelAdapterOptions): Promise<any> {
    const instance = new this()
    instance.fill(values)
    instance.$setOptionsAndTrx(options)

    await instance.save()
    return instance
  }

  /**
   * Same as [[BaseModel.create]], but persists multiple instances. The create
   * many call will be wrapped inside a managed transaction for consistency.
   * If required, you can also pass a transaction client and the method
   * will use that instead of create a new one.
   */
  public static async createMany (values: any, options?: ModelAdapterOptions): Promise<any[]> {
    const client = this.$adapter.modelConstructorClient(this, options)

    return managedTransaction(client, async (trx) => {
      const modelInstances: LucidRow[] = []
      for (let row of values) {
        const modelInstance = await this.create(row, { client: trx })
        modelInstances.push(modelInstance)
      }
      return modelInstances
    })
  }

  /**
   * Find model instance using the primary key
   */
  public static async find (value: any, options?: ModelAdapterOptions) {
    if (value === undefined) {
      throw new Exception('"find" expects a value. Received undefined')
    }

    return this.findBy(this.primaryKey, value, options)
  }

  /**
   * Find model instance using the primary key
   */
  public static async findOrFail (value: any, options?: ModelAdapterOptions) {
    if (value === undefined) {
      throw new Exception('"findOrFail" expects a value. Received undefined')
    }

    return this.findByOrFail(this.primaryKey, value, options)
  }

  /**
   * Find model instance using a key/value pair
   */
  public static async findBy (key: string, value: any, options?: ModelAdapterOptions) {
    if (value === undefined) {
      throw new Exception('"findBy" expects a value. Received undefined')
    }

    return this.query(options).where(key, value).first()
  }

  /**
   * Find model instance using a key/value pair
   */
  public static async findByOrFail (key: string, value: any, options?: ModelAdapterOptions) {
    if (value === undefined) {
      throw new Exception('"findByOrFail" expects a value. Received undefined')
    }
    return this.query(options).where(key, value).firstOrFail()
  }

  /**
   * Same as `query().first()`
   */
  public static async first (options?: ModelAdapterOptions) {
    return this.query(options).first()
  }

  /**
   * Same as `query().firstOrFail()`
   */
  public static async firstOrFail (options?: ModelAdapterOptions) {
    return this.query(options).firstOrFail()
  }

  /**
   * Find model instance using a key/value pair
   */
  public static async findMany (value: any[], options?: ModelAdapterOptions) {
    if (value === undefined) {
      throw new Exception('"findMany" expects a value. Received undefined')
    }

    return this
      .query(options)
      .whereIn(this.primaryKey, value)
      .orderBy(this.primaryKey, 'desc')
      .exec()
  }

  /**
   * Find model instance using a key/value pair or create a
   * new one without persisting it.
   */
  public static async firstOrNew (
    search: any,
    savePayload?: any,
    options?: ModelAdapterOptions,
  ) {
    const query = this.query(options)
    let row = await query.where(search).first()

    if (!row) {
      row = new this()
      row.fill(Object.assign({}, search, savePayload))

      /**
       * Pass client options to the newly created row. If row was found
       * the query builder will set the same options.
       */
      row.$setOptionsAndTrx(query.clientOptions)
    }

    return row
  }

  /**
   * Same as `firstOrNew`, but persists the newly created model instance
   */
  public static async firstOrCreate<T extends LucidModel> (
    this: T,
    search: any,
    savePayload?: any,
    options?: ModelAdapterOptions,
  ) {
    const row = await this.firstOrNew(search, savePayload, options)
    if (!row.$isPersisted) {
      await row.save()
    }

    return row
  }

  /**
   * Updates or creates a new row inside the database
   */
  public static async updateOrCreate (
    search: any,
    updatedPayload: any,
    options?: ModelAdapterOptions,
  ) {
    const row = await this.firstOrNew(search, updatedPayload, options)

    /**
     * Update if row was found
     */
    if (row.$isPersisted) {
      row.merge(updatedPayload)
    }

    await row.save()
    return row
  }

  /**
   * Find existing rows or create an in-memory instances of the
   * missing one's.
   */
  public static async fetchOrNewUpMany (
    uniqueKey: any,
    payload: any,
    options?: ModelAdapterOptions,
    mergeAttributes: boolean = false,
  ) {
    /**
     * An array of values for the unique key
     */
    const uniqueKeyValues = payload.map((row: any) => {
      return ensureValue(row, uniqueKey as string, () => {
        throw new Exception(
          `Value for the "${uniqueKey}" is null or undefined inside "fetchOrNewUpMany" payload`,
        )
      })
    })

    const query = this.query(options)
    const existingRows = await query.whereIn(uniqueKey, uniqueKeyValues)

    /**
     * Return existing or create missing rows in the same order as the original
     * array
     */
    return payload.map((row: any) => {
      /* eslint-disable-next-line eqeqeq */
      const existingRow = existingRows.find((one: any) => one[uniqueKey] == row[uniqueKey])

      /**
       * Return the row found from the select call
       */
      if (existingRow) {
        if (mergeAttributes) {
          existingRow.merge(row)
        }
        return existingRow
      }

      /**
       * Otherwise create a new one
       */
      const instance = new this()
      instance.fill(row)
      instance.$setOptionsAndTrx(query.clientOptions)
      return instance
    })
  }

  /**
   * Find existing rows or create missing one's. One database call per insert
   * is invoked, so that each insert goes through the lifecycle of model
   * hooks.
   */
  public static async fetchOrCreateMany (
    uniqueKey: any,
    payload: any,
    options?: ModelAdapterOptions,
  ) {
    const rows = await this.fetchOrNewUpMany(uniqueKey, payload, options)
    if (!rows.length) {
      return rows
    }

    const client = this.$adapter.modelClient(rows[0])
    await managedTransaction(client, async (trx) => {
      for (let row of rows) {
        /**
         * If transaction `client` was passed, then the row will have
         * the `trx` already set. But since, the trx of row will be
         * same as the `trx` passed to this callback, we can safely
         * re-set it.
         */
        row.$trx = trx
        if (!row.isPersisted) {
          await row.save()
        }
      }
    })

    return rows
  }

  /**
   * Update existing rows or create missing one's. One database call per insert
   * is invoked, so that each insert and update goes through the lifecycle
   * of model hooks.
   */
  public static async updateOrCreateMany (
    uniqueKey: any,
    payload: any,
    options?: ModelAdapterOptions,
  ) {
    const rows = await this.fetchOrNewUpMany(uniqueKey, payload, options, true)
    if (!rows.length) {
      return rows
    }

    const client = this.$adapter.modelClient(rows[0])
    await managedTransaction(client, async (trx) => {
      for (let row of rows) {
        /**
         * If transaction `client` was passed, then the row will have
         * the `trx` already set. But since, the trx of row will be
         * same as the `trx` passed to this callback, we can safely
         * re-set it.
         */
        row.$trx = trx
        await row.save()
      }
    })

    return rows
  }

  /**
   * Returns all rows from the model table
   */
  public static async all (options?: ModelAdapterOptions) {
    return this.query(options).orderBy(this.primaryKey, 'desc')
  }

  /**
   * Truncate model table
   */
  public static truncate (cascade: boolean = false) {
    return this.query().client.truncate(this.table, cascade)
  }

  constructor () {
    return new Proxy(this, proxyHandler)
  }

  /**
   * Custom options defined on the model instance that are
   * passed to the adapter
   */
  private modelOptions?: ModelOptions

  /**
   * Reference to transaction that will be used for performing queries on a given
   * model instance.
   */
  private modelTrx?: TransactionClientContract

  /**
   * The transaction listener listens for the `commit` and `rollback` events and
   * cleansup the `$trx` reference
   */
  private transactionListener = function listener () {
    this.modelTrx = undefined
  }.bind(this)

  /**
   * When `fill` method is called, then we may have a situation where it
   * removed the values which exists in `original` and hence the dirty
   * diff has to do a negative diff as well
   */
  private fillInvoked: boolean = false

  /**
   * A copy of cached getters
   */
  private cachedGetters: { [key: string]: CacheNode } = {}

  /**
   * Raises exception when mutations are performed on a delete model
   */
  private ensureIsntDeleted () {
    if (this.$isDeleted) {
      throw new Exception('Cannot mutate delete model instance', 500, 'E_MODEL_DELETED')
    }
  }

  /**
   * Invoked when performing the insert call. The method initiates
   * all `datetime` columns, if there are not initiated already
   * and `autoCreate` or `autoUpdate` flags are turned on.
   */
  protected initiateAutoCreateColumns () {
    const model = this.constructor as LucidModel

    model.$columnsDefinitions.forEach((column, attributeName) => {
      const columnType = column.meta?.type

      /**
       * Return early when not dealing with date time columns
       */
      if (!columnType || !DATE_TIME_TYPES[columnType]) {
        return
      }

      /**
       * Set the value when its missing and `autoCreate` or `autoUpdate`
       * flags are defined.
       */
      const attributeValue = this[attributeName]
      if (!attributeValue && (column.meta.autoCreate || column.meta.autoUpdate)) {
        this[attributeName] = DateTime.local()
        return
      }
    })
  }

  /**
   * Invoked when performing the update call. The method initiates
   * all `datetime` columns, if there have `autoUpdate` flag
   * turned on.
   */
  protected initiateAutoUpdateColumns () {
    const model = this.constructor as LucidModel

    model.$columnsDefinitions.forEach((column, attributeName) => {
      const columnType = column.meta?.type

      /**
       * Return early when not dealing with date time columns or auto update
       * is not set to true
       */
      if (!columnType || !DATE_TIME_TYPES[columnType] || !column.meta.autoUpdate) {
        return
      }

      this[attributeName] = DateTime.local()
    })
  }

  /**
   * Preparing the object to be sent to the adapter. We need
   * to create the object with the property names to be
   * used by the adapter.
   */
  protected prepareForAdapter (attributes: ModelObject) {
    const Model = this.constructor as typeof BaseModel

    return Object.keys(attributes).reduce((result, key) => {
      const column = Model.$getColumn(key)!

      const value = typeof (column.prepare) === 'function'
        ? column.prepare(attributes[key], key, this)
        : attributes[key]

      result[column.columnName] = value
      return result
    }, {})
  }

  /**
   * Returns true when the field must be included
   * inside the serialized object.
   */
  private shouldSerializeField (
    serializeAs: string | null,
    cherryPickObject?: ModelObject,
  ): serializeAs is string {
    /**
     * If explicit serializing is turned off, then never
     * return the field
     */
    if (!serializeAs) {
      return false
    }

    /**
     * If their is no cherry picking object defined, then always
     * include the field
     */
    if (!cherryPickObject) {
      return true
    }

    /**
     * Otherwise ensure the cherry picking object has marked
     * the field as true
     */
    return cherryPickObject[serializeAs] === true || isObject(cherryPickObject[serializeAs])
  }

  /**
   * A type only reference to the columns
   */
  public $columns: any = {}

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
  public $preloaded: { [relation: string]: LucidRow | LucidRow[] } = {}

  /**
   * Extras are dynamic properties set on the model instance, which
   * are not serialized and neither casted for adapter calls.
   *
   * This is helpful when adapter wants to load some extra data conditionally
   * and that data must not be persisted back the adapter.
   */
  public $extras: ModelObject = {}

  /**
   * Sideloaded are dynamic properties set on the model instance, which
   * are not serialized and neither casted for adapter calls.
   *
   * This is helpful when you want to add dynamic meta data to the model
   * and it's children as well.
   *
   * The difference between [[extras]] and [[sideloaded]] is:
   *
   * - Extras can be different for each model instance
   * - Extras are not shared down the hierarchy (example relationships)
   * - Sideloaded are shared across multiple model instances created via `$createMultipleFromAdapterResult`.
   * - Sideloaded are passed to the relationships as well.
   */
  public $sideloaded: ModelObject = {}

  /**
   * Persisted means the model has been persisted with the adapter. This will
   * also be true, when model instance is created as a result of fetch
   * call from the adapter.
   */
  public $isPersisted: boolean = false

  /**
   * Once deleted the model instance cannot make calls to the adapter
   */
  public $isDeleted: boolean = false

  /**
   * `$isLocal` tells if the model instance was created locally vs
   * one generated as a result of fetch call from the adapter.
   */
  public $isLocal: boolean = true

  /**
   * Returns the value of primary key. The value must be
   * set inside attributes object
   */
  public get $primaryKeyValue (): any | undefined {
    const model = this.constructor as typeof BaseModel
    const column = model.$getColumn(model.primaryKey)

    if (column && column.hasGetter) {
      return this[model.primaryKey]
    }

    return this.$getAttribute(model.primaryKey)
  }

  /**
   * Opposite of [[this.isPersisted]]
   */
  public get $isNew (): boolean {
    return !this.$isPersisted
  }

  /**
   * Returns dirty properties of a model by doing a diff
   * between original values and current attributes
   */
  public get $dirty (): any {
    const processedKeys: string[] = []

    /**
     * Do not compute diff, when model has never been persisted
     */
    if (!this.$isPersisted) {
      return this.$attributes
    }

    const dirty = Object.keys(this.$attributes).reduce((result, key) => {
      const value = this.$attributes[key]
      const originalValue = this.$original[key]

      if (originalValue !== value) {
        result[key] = value
      }

      if (this.fillInvoked) {
        processedKeys.push(key)
      }

      return result
    }, {})

    /**
     * Find negative diff if fill was invoked, since we may have removed values
     * that exists in originals
     */
    if (this.fillInvoked) {
      Object.keys(this.$original)
        .filter((key) => !processedKeys.includes(key))
        .forEach((key) => {
          dirty[key] = null
        })
    }

    return dirty
  }

  /**
   * Finding if model is dirty with changes or not
   */
  public get $isDirty () {
    return Object.keys(this.$dirty).length > 0
  }

  /**
   * Returns the transaction
   */
  public get $trx (): TransactionClientContract | undefined {
    return this.modelTrx
  }

  /**
   * Set the trx to be used by the model to executing queries
   */
  public set $trx (trx: TransactionClientContract | undefined) {
    if (!trx) {
      this.modelTrx = undefined
      return
    }

    /**
     * Remove old listeners
     */
    if (this.modelTrx) {
      this.modelTrx.removeListener('commit', this.transactionListener)
      this.modelTrx.removeListener('rollback', this.transactionListener)
    }

    /**
     * Store reference to the transaction
     */
    this.modelTrx = trx
    this.modelTrx.once('commit', this.transactionListener)
    this.modelTrx.once('rollback', this.transactionListener)
  }

  /**
   * Get options
   */
  public get $options (): ModelOptions | undefined {
    return this.modelOptions
  }

  /**
   * Set options
   */
  public set $options (options: ModelOptions | undefined) {
    if (!options) {
      return
    }

    this.modelOptions = this.modelOptions || {}
    if (options.connection) {
      this.modelOptions.connection = options.connection
    }

    if (options.profiler) {
      this.modelOptions.profiler = options.profiler
    }
  }

  /**
   * Set options on the model instance along with transaction
   */
  public $setOptionsAndTrx (options?: ModelAdapterOptions): void {
    if (!options) {
      return
    }

    if (options.client && options.client.isTransaction) {
      this.$trx = options.client as TransactionClientContract
    }
    this.$options = options
  }

  /**
   * Set attribute
   */
  public $setAttribute (key: string, value: any) {
    this.ensureIsntDeleted()
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
    const cached = this.cachedGetters[key]

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
      this.cachedGetters[key] = { getter: callback, original, resolved }
    } else {
      /**
       * Update original and resolved keys
       */
      this.cachedGetters[key].original = original
      this.cachedGetters[key].resolved = resolved
    }

    return resolved
  }

  /**
   * Returns the related model or default value when model is missing
   */
  public $getRelated (key: any): any {
    return this.$preloaded[key]
  }

  /**
   * A boolean to know if relationship has been preloaded or not
   */
  public $hasRelated (key: any): boolean {
    return this.$preloaded[key] !== undefined
  }

  /**
   * Sets the related data on the model instance. The method internally handles
   * `one to one` or `many` relations
   */
  public $setRelated (key: any, models: LucidRow | LucidRow[]) {
    const Model = this.constructor as typeof BaseModel
    const relation = Model.$relationsDefinitions.get(key as string)

    /**
     * Ignore when relation is not defined
     */
    if (!relation) {
      return
    }

    /**
     * Reset array before invoking $pushRelated
     */
    if (MANY_RELATIONS.includes(relation.type)) {
      if (!Array.isArray(models)) {
        throw new Exception(
          `"${Model.name}.${key}" must be an array when setting "${relation.type}" relationship`,
        )
      }
      this.$preloaded[key] = []
    }

    return this.$pushRelated(key, models)
  }

  /**
   * Push related adds to the existing related collection
   */
  public $pushRelated (key: any, models: LucidRow | LucidRow[]) {
    const Model = this.constructor as typeof BaseModel
    const relation = Model.$relationsDefinitions.get(key as string)

    /**
     * Ignore when relation is not defined
     */
    if (!relation) {
      return
    }

    /**
     * Create multiple for `hasMany` `manyToMany` and `hasManyThrough`
     */
    if (MANY_RELATIONS.includes(relation.type)) {
      this.$preloaded[key] = ((this.$preloaded[key] || []) as LucidRow[]).concat(models)
      return
    }

    /**
     * Dis-allow setting multiple model instances for a one to one relationship
     */
    if (Array.isArray(models)) {
      throw new Error(
        `"${Model.name}.${key}" cannot reference more than one instance of "${relation.relatedModel().name}" model`
      )
    }

    this.$preloaded[key] = models
  }

  /**
   * Merges the object with the model attributes, assuming object keys
   * are coming the database.
   *
   * 1. If key is unknown, it will be added to the `extras` object.
   * 2. If key is defined as a relationship, it will be ignored and one must call `$setRelated`.
   */
  public $consumeAdapterResult (adapterResult: ModelObject, sideloadedAttributes?: ModelObject) {
    const Model = this.constructor as typeof BaseModel

    /**
     * Merging sideloaded attributes with the existing sideloaded values
     * on the model instance
     */
    if (sideloadedAttributes) {
      this.$sideloaded = Object.assign({}, this.$sideloaded, sideloadedAttributes)
    }

    /**
     * Merge result of adapter with the attributes. This enables
     * the adapter to hydrate models with properties generated
     * as a result of insert or update
     */
    if (isObject(adapterResult)) {
      Object.keys(adapterResult).forEach((key) => {
        /**
         * Pull the attribute name from the column name, since adapter
         * results always holds the column names.
         */
        const attributeName = Model.$keys.columnsToAttributes.get(key)
        if (attributeName) {
          const attribute = Model.$getColumn(attributeName)!

          /**
           * Invoke `consume` method for the column, before setting the
           * attribute
           */
          const value = typeof (attribute.consume) === 'function'
            ? attribute.consume(adapterResult[key], attributeName, this)
            : adapterResult[key]

          /**
           * When consuming the adapter result, we must always set the attributes
           * directly, as we do not want to invoke setters.
           */
          this.$setAttribute(attributeName, value)
          return
        }

        /**
         * If key is defined as a relation, then ignore it, since one
         * must pass a qualified model to `this.$setRelated()`
         */
        if (Model.$relationsDefinitions.has(key)) {
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
  public fill (values: any, allowNonExtraProperties: boolean = false) {
    this.$attributes = {}
    this.merge(values, allowNonExtraProperties)
    this.fillInvoked = true
  }

  /**
   * Merge bulk attributes with existing attributes.
   *
   * 1. If key is unknown, it will be added to the `extras` object.
   * 2. If key is defined as a relationship, it will be ignored and one must call `$setRelated`.
   */
  public merge (values: any, allowNonExtraProperties: boolean = false) {
    const Model = this.constructor as typeof BaseModel

    /**
     * Merge values with the attributes
     */
    if (isObject(values)) {
      Object.keys(values).forEach((key) => {
        const value = values[key]

        /**
         * Set as column
         */
        if (Model.$hasColumn(key)) {
          this[key] = value
          return
        }

        /**
         * Resolve the attribute name from the column names. Since people
         * usaully define the column names directly as well by
         * accepting them directly from the API.
         */
        const attributeName = Model.$keys.columnsToAttributes.get(key)
        if (attributeName) {
          this[attributeName] = value
          return
        }

        /**
         * If key is defined as a relation, then ignore it, since one
         * must pass a qualified model to `this.$setRelated()`
         */
        if (Model.$relationsDefinitions.has(key)) {
          return
        }

        /**
         * Raise error when not instructed to ignore non-existing properties.
         */
        if (!allowNonExtraProperties) {
          throw new Error(
            `Cannot define "${key}" on "${Model.name}" model, since it is not defined as a model property`,
          )
        }

        this.$extras[key] = value
      })
    }
  }

  /**
   * Preloads one or more relationships for the current model
   */
  public async preload (relationName: any, callback?: any) {
    this.ensureIsntDeleted()
    const constructor = this.constructor as LucidModel
    const preloader = new Preloader(constructor)

    if (typeof (relationName) === 'function') {
      relationName(preloader)
    } else {
      preloader.preload(relationName, callback)
    }

    await preloader
      .sideload(this.$sideloaded)
      .processAllForOne(this, constructor.$adapter.modelClient(this))
  }

  /**
   * Perform save on the model instance to commit mutations.
   */
  public async save () {
    this.ensureIsntDeleted()
    const Model = this.constructor as typeof BaseModel

    /**
     * Persit the model when it's not persisted already
     */
    if (!this.$isPersisted) {
      await Model.$hooks.exec('before', 'create', this)
      await Model.$hooks.exec('before', 'save', this)

      this.initiateAutoCreateColumns()
      await Model.$adapter.insert(this, this.prepareForAdapter(this.$attributes))

      this.$hydrateOriginals()
      this.$isPersisted = true

      await Model.$hooks.exec('after', 'create', this)
      await Model.$hooks.exec('after', 'save', this)
      return
    }

    /**
     * Call hooks before hand, so that they have the chance
     * to make mutations that produces one or more `$dirty`
     * fields.
     */
    await Model.$hooks.exec('before', 'update', this)
    await Model.$hooks.exec('before', 'save', this)

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
    this.initiateAutoUpdateColumns()
    await Model.$adapter.update(this, this.prepareForAdapter(dirty))
    this.$hydrateOriginals()
    this.$isPersisted = true

    await Model.$hooks.exec('after', 'update', this)
    await Model.$hooks.exec('after', 'save', this)
  }

  /**
   * Perform delete by issuing a delete request on the adapter
   */
  public async delete () {
    this.ensureIsntDeleted()
    const Model = this.constructor as typeof BaseModel

    await Model.$hooks.exec('before', 'delete', this)

    await Model.$adapter.delete(this)
    this.$isDeleted = true

    await Model.$hooks.exec('after', 'delete', this)
  }

  /**
   * Serializes model attributes to a plain object
   */
  public serializeAttributes (
    fieldsToCherryPick?: ModelObject,
    raw: boolean = false,
  ): ModelObject {
    const Model = this.constructor as LucidModel

    return Object.keys(this.$attributes).reduce<ModelObject>((result, key) => {
      const column = Model.$getColumn(key)!
      if (!this.shouldSerializeField(column.serializeAs, fieldsToCherryPick)) {
        return result
      }

      const value = this[key]
      result[column.serializeAs] = typeof (column.serialize) === 'function' && !raw
        ? column.serialize(value, key, this)
        : value

      return result
    }, {})
  }

  /**
   * Serializes model compute properties to an object.
   */
  public serializeComputed (fieldsToCherryPick?: ModelObject): ModelObject {
    const Model = this.constructor as LucidModel
    const result: ModelObject = {}

    Model.$computedDefinitions.forEach((value, key) => {
      const computedValue = this[key]
      if (computedValue !== undefined && this.shouldSerializeField(value.serializeAs, fieldsToCherryPick)) {
        result[value.serializeAs] = computedValue
      }
    })

    return result
  }

  /**
   * Serializes relationships to a plain object. When `raw=true`, it will
   * recurisvely serialize the relationships as well.
   */
  public serializeRelations (
    fieldsToCherryPick: ModelObject | undefined,
    raw: true,
  ): { [key: string]: LucidRow | LucidRow[] }

  public serializeRelations (
    fieldsToCherryPick: ModelObject | undefined,
    raw: false | undefined,
  ): ModelObject

  public serializeRelations (
    fieldsToCherryPick?: ModelObject,
    raw: boolean = false,
  ): ModelObject | { [key: string]: LucidRow | LucidRow[] } {
    const Model = this.constructor as LucidModel

    return Object.keys(this.$preloaded).reduce((result, key) => {
      const relation = Model.$getRelation(key as any)! as RelationshipsContract
      if (!this.shouldSerializeField(relation.serializeAs, fieldsToCherryPick)) {
        return result
      }

      const value = this.$preloaded[key]
      if (raw) {
        result[relation.serializeAs] = value
        return result
      }

      /**
       * Always make sure we passing a valid object or undefined
       * to the relationships
       */
      let relationCherryPickKeys = (fieldsToCherryPick || {})[relation.serializeAs]
      relationCherryPickKeys = isObject(relationCherryPickKeys) ? relationCherryPickKeys : undefined

      result[relation.serializeAs] = Array.isArray(value)
        ? value.map((one) => one.serialize(relationCherryPickKeys))
        : value.serialize(relationCherryPickKeys)

      return result
    }, {})
  }

  /**
   * Converting model to it's JSON representation
   */
  public serialize (fieldsToCherryPick?: ModelObject) {
    return {
      ...this.serializeAttributes(fieldsToCherryPick, false),
      ...this.serializeRelations(fieldsToCherryPick, false),
      ...this.serializeComputed(fieldsToCherryPick),
    }
  }

  /**
   * Returns the serialize method output. However, any model can overwrite
   * it to define it's custom serialize output
   */
  public toJSON () {
    return this.serialize()
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
    const primaryKeyColumn = modelConstructor.$keys.attributesToColumns.get(
      modelConstructor.primaryKey,
      modelConstructor.primaryKey,
    )

    /**
     * Returning insert query for the inserts
     */
    if (action === 'insert') {
      const insertQuery = client.insertQuery().table(modelConstructor.table)
      insertQuery.returning(primaryKeyColumn)
      return insertQuery
    }

    /**
     * Returning generic query builder for rest of the queries
     */
    return client
      .modelQuery(modelConstructor)
      .where(primaryKeyColumn, this.$primaryKeyValue)
  }

  /**
   * Returns an instance of relationship on the given model
   */
  public related (relationName: any): any {
    const Model = this.constructor as typeof BaseModel
    const relation = Model.$getRelation(relationName as string)
    ensureRelation(relationName, relation)

    relation!.boot()
    return relation!.client(this, Model.$adapter.modelClient(this))
  }

  /**
   * Reload/Refresh the model instance
   */
  public async refresh () {
    this.ensureIsntDeleted()
    const modelConstructor = this.constructor as typeof BaseModel
    const { table } = modelConstructor
    const primaryKeyColumn = modelConstructor.$keys.attributesToColumns.get(
      modelConstructor.primaryKey,
      modelConstructor.primaryKey,
    )

    /**
     * Noop when model instance is not persisted
     */
    if (!this.$isPersisted) {
      return
    }

    /**
     * This will occur, when some other part of the application removes
     * the row
     */
    const freshModelInstance = await modelConstructor.find(this.$primaryKeyValue)
    if (!freshModelInstance) {
      throw new Exception(
        [
          '"Model.refresh" failed. ',
          `Unable to lookup "${table}" table where "${primaryKeyColumn}" = ${this.$primaryKeyValue}`,
        ].join(''),
      )
    }

    this.fill(freshModelInstance.$attributes)
    this.$hydrateOriginals()
  }
}
