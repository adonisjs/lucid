/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DateTime } from 'luxon'
import type Hooks from '@poppinss/hooks'
import { DialectContract, QueryClientContract, TransactionClientContract } from './database.js'

import {
  Update,
  Counter,
  OneOrMany,
  Aggregate,
  Returning,
  ChainableContract,
  SimplePaginatorMetaKeys,
  SimplePaginatorContract,
  ExcutableQueryBuilderContract,
} from './querybuilder.js'
import {
  ExtractModelRelations,
  Has,
  ManyToManyRelationOptions,
  ModelRelationTypes,
  ModelRelations,
  Preload,
  PreloaderContract,
  RelationOptions,
  RelationshipsContract,
  ThroughRelationOptions,
  WhereHas,
  WithAggregate,
  WithCount,
} from './relations.js'

/**
 * ------------------------------------------------------
 *  Helpers
 * ------------------------------------------------------
 */

/**
 * Same as [[Parameters]] but omits the first parameter
 */
type OmitFirst<T extends (...args: any) => any> = T extends (x: any, ...args: infer P) => any
  ? P
  : never

/**
 * Same as [[Pick]] but picks by value and not the key
 */
type PickProperties<T, P> = Pick<T, { [K in keyof T]: T[K] extends P ? K : never }[keyof T]>

/**
 * Decorator function
 */
export type DecoratorFn = (target: any, property: any) => void

/**
 * Typed decorator
 */
export type TypedDecorator<PropType> = <
  TKey extends string,
  TTarget extends { [K in TKey]: PropType },
>(
  target: TTarget,
  property: TKey
) => void

/**
 * Typed decorator that also represents an optional property
 */
export type OptionalTypedDecorator<PropType> = <
  TKey extends string,
  TTarget extends { [K in TKey]?: PropType },
>(
  target: TTarget,
  property: TKey
) => void

/**
 * A complex type that filters out functions and relationships from the
 * model attributes and consider all other properties as database
 * columns. Alternatively, the user can self define a `$columns`
 * property.
 */
export type ModelAttributes<Model extends LucidRow> = Model['$columns'] extends undefined
  ? {
      [Filtered in {
        [P in keyof Model]: P extends keyof LucidRow | 'serializeExtras'
          ? never
          : Model[P] extends Function | ModelRelationTypes
            ? never
            : P
      }[keyof Model]]: Model[Filtered]
    }
  : Model['$columns']

/**
 * Extract the query scopes of a model
 */
export type ExtractScopes<Model extends LucidModel> = {
  [Scope in keyof PickProperties<Model, QueryScope<Model, QueryScopeCallback<Model>>>]: (
    ...args: Model[Scope] extends QueryScopeCallback<Model> ? OmitFirst<Model[Scope]> : never
  ) => ExtractScopes<Model>
}

/**
 * Reusable interface to define an object.
 */
export interface ModelObject {
  [key: string]: any
}

/**
 * Shape of cache node to keep getters optimized
 */
export type CacheNode = {
  original: any
  resolved: any
  getter: (value: any) => any
}

/**
 * Shape for cherry picking fields
 */
export type CherryPickFields =
  | string[]
  | {
      pick?: string[]
      omit?: string[]
    }

/**
 * Shape for cherry picking fields on nested relationships
 */
export type CherryPick = {
  fields?: CherryPickFields
  relations?: { [relation: string]: CherryPick }
}

/**
 * List of events for which a model will trigger hooks
 */
export type EventsList = 'save' | 'create' | 'update' | 'delete' | 'fetch' | 'find' | 'paginate'
export type HooksHandler<Data, Event extends EventsList> = (
  data: Data,
  event: Event
) => Promise<void> | void

/**
 * ------------------------------------------------------
 * Query Scope
 * ------------------------------------------------------
 */

/**
 * Generic query scope callback
 */
export type QueryScopeCallback<Model extends LucidModel = LucidModel> = (
  query: ModelQueryBuilderContract<Model>,
  ...args: any[]
) => void

/**
 * Query scope
 */
export type QueryScope<
  Model extends LucidModel,
  Scope extends QueryScopeCallback<Model>,
> = Scope & {
  readonly isQueryScope: true
}

/**
 * A function to mark a method as query scope
 */
export type ScopeFn = <
  Model extends LucidModel,
  Scope extends QueryScopeCallback<Model> = QueryScopeCallback<Model>,
>(
  callback: Scope
) => QueryScope<Model, Scope>

/**
 * ------------------------------------------------------
 * Decorators and Options
 * ------------------------------------------------------
 */

/**
 * Options for defining a column
 */
export type ColumnOptions = {
  columnName: string // database column name
  serializeAs: string | null // null means do not serialize column
  isPrimary: boolean
  meta?: any

  /**
   * Invoked before serializing process happens
   */
  serialize?: (value: any, attribute: string, model: LucidRow) => any

  /**
   * Invoked before create or update happens
   */
  prepare?: (value: any, attribute: string, model: LucidRow) => any

  /**
   * Invoked when row is fetched from the database
   */
  consume?: (value: any, attribute: string, model: LucidRow) => any
}

/**
 * Shape of column options after they have set on the model
 */
export type ModelColumnOptions = ColumnOptions & {
  hasGetter: boolean
  hasSetter: boolean
}

/**
 * Represents a computed property on the model
 */
export type ComputedOptions = {
  serializeAs: string | null
  meta?: any
}

/**
 * Options accepted by the Model.$addRelation method
 */
export type ModelRelationOptions =
  | RelationOptions<LucidModel, LucidModel, ModelRelations<LucidModel, LucidModel>>
  | ManyToManyRelationOptions<ModelRelations<LucidModel, LucidModel>>
  | ThroughRelationOptions<LucidModel, LucidModel, ModelRelations<LucidModel, LucidModel>>

/**
 * Signature for column decorator function
 */
export type ColumnDecorator = (options?: Partial<ColumnOptions>) => DecoratorFn

/**
 * Signature for computed decorator function
 */
export type ComputedDecorator = (options?: Partial<ComputedOptions>) => DecoratorFn

/**
 * Decorator for defining date columns
 */
export type DateColumnDecorator = (
  options?: Partial<
    ColumnOptions & {
      autoCreate: boolean
      autoUpdate: boolean
    }
  >
) => OptionalTypedDecorator<DateTime | null>

/**
 * Decorator for defining date time columns. It is same as
 * date column as of now
 */
export type DateTimeColumnDecorator = DateColumnDecorator

/**
 * Decorator for defining hooks. The generics enforces that
 * decorator is used on static properties only
 */
export type HooksDecorator = () => <Model extends LucidModel>(
  target: Model,
  property: string
) => void

/**
 * ------------------------------------------------------
 * Model Options
 * ------------------------------------------------------
 */

/**
 * Model options to be used when making queries
 */
export type ModelOptions = {
  connection?: string
}

/**
 * Adapter also accepts a client directly
 */
export type ModelAdapterOptions = ModelOptions & {
  client?: QueryClientContract
}

/**
 * Options used by the method that internally invokes
 * the merge method.
]   */
export type ModelAssignOptions = ModelAdapterOptions & {
  allowExtraProperties?: boolean
}

/**
 * Preload function on a model instance
 */
export interface LucidRowPreload<Model extends LucidRow> extends Preload<Model, Promise<void>> {
  (callback: (preloader: PreloaderContract<Model>) => void): Promise<void>
}

export interface LucidRowAggregate<Model extends LucidRow> extends Preload<Model, Promise<void>> {
  (callback: (preloader: PreloaderContract<Model>) => void): Promise<void>
}

/**
 * An extension of the simple paginator with support for serializing models
 */
export interface ModelPaginatorContract<Result extends LucidRow>
  extends Omit<SimplePaginatorContract<Result>, 'toJSON'> {
  serialize(cherryPick?: CherryPick): { meta: any; data: ModelObject[] }
  toJSON(): { meta: any; data: ModelObject[] }
}

/**
 * Lazy load aggregates for a given model instance
 */
export interface LazyLoadAggregatesContract<Model extends LucidRow> extends Promise<void> {
  loadAggregate: WithAggregate<Model, this>
  loadCount: WithCount<Model, this>
  exec(): Promise<void>
}

/**
 * ------------------------------------------------------
 * Model Query Builder
 * ------------------------------------------------------
 */

/**
 * Model query builder will have extras methods on top of the Database query builder
 */
export interface ModelQueryBuilderContract<Model extends LucidModel, Result = InstanceType<Model>>
  extends ChainableContract,
    ExcutableQueryBuilderContract<Result[]> {
  model: Model
  returning: Returning<this>

  /**
   * Define a callback to transform a row
   */
  rowTransformer(callback: (row: LucidRow) => void): this

  /**
   * Define a custom preloader for the current query
   */
  usePreloader(preloader: PreloaderContract<LucidRow>): this

  /**
   * Whether or not the query is a child query generated for `.where`
   * callbacks
   */
  isChildQuery: boolean

  /**
   * Alias for the @withScopes method
   */
  apply<Scopes extends ExtractScopes<Model>>(callback: (scopes: Scopes) => void): this

  /**
   * Apply model query scopes on the query bulder
   */
  withScopes<Scopes extends ExtractScopes<Model>>(callback: (scopes: Scopes) => void): this

  /**
   * A copy of client options.
   */
  readonly clientOptions: ModelAdapterOptions

  /**
   * Reference to query client used for making queries
   */
  client: QueryClientContract

  /**
   * Clone query builder instance
   */
  clone<ClonedResult = Result>(): ModelQueryBuilderContract<Model, ClonedResult>

  /**
   * A custom set of sideloaded properties defined on the query
   * builder, this will be passed to the model instance created
   * by the query builder
   */
  sideload(value: ModelObject): this

  /**
   * Execute and get first result
   */
  first(): Promise<Result | null>

  /**
   * Return the first matching row or fail
   */
  firstOrFail(): Promise<Result>

  /**
   * Perform delete operation
   */
  del(returning?: OneOrMany<string>): ModelQueryBuilderContract<Model, any>
  delete(returning?: OneOrMany<string>): ModelQueryBuilderContract<Model, any>

  /**
   * A shorthand to define limit and offset based upon the
   * current page
   */
  forPage(page: number, perPage?: number): this

  /**
   * Execute query with pagination
   */
  paginate(
    page: number,
    perPage?: number
  ): Promise<
    Result extends LucidRow ? ModelPaginatorContract<Result> : SimplePaginatorContract<Result>
  >

  /**
   * Mutations (update and increment can be one query aswell)
   */
  update: Update<ModelQueryBuilderContract<Model, any>>
  increment: Counter<ModelQueryBuilderContract<Model, any>>
  decrement: Counter<ModelQueryBuilderContract<Model, any>>

  /**
   * Fetch relationship count
   */
  withCount: WithCount<InstanceType<Model>, this>

  /**
   * Fetch aggregate value for a given relationship
   */
  withAggregate: WithAggregate<InstanceType<Model>, this>

  /**
   * Add where constraint using the relationship
   */
  has: Has<InstanceType<Model>, this>
  orHas: Has<InstanceType<Model>, this>
  andHas: Has<InstanceType<Model>, this>
  doesntHave: Has<InstanceType<Model>, this>
  orDoesntHave: Has<InstanceType<Model>, this>
  andDoesntHave: Has<InstanceType<Model>, this>

  /**
   * Add where constraint using the relationship with a custom callback
   */
  whereHas: WhereHas<InstanceType<Model>, this>
  orWhereHas: WhereHas<InstanceType<Model>, this>
  andWhereHas: WhereHas<InstanceType<Model>, this>
  whereDoesntHave: WhereHas<InstanceType<Model>, this>
  orWhereDoesntHave: WhereHas<InstanceType<Model>, this>
  andWhereDoesntHave: WhereHas<InstanceType<Model>, this>

  /**
   * Define relationships to be preloaded
   */
  preload: Preload<InstanceType<Model>, this>

  /**
   * Aggregates
   */
  count: Aggregate<this>
  countDistinct: Aggregate<this>
  min: Aggregate<this>
  max: Aggregate<this>
  sum: Aggregate<this>
  sumDistinct: Aggregate<this>
  avg: Aggregate<this>
  avgDistinct: Aggregate<this>

  /**
   * Executes the callback when dialect matches one of the mentioned
   * dialects
   */
  ifDialect(
    dialect: DialectContract['name'] | DialectContract['name'][],
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this

  /**
   * Executes the callback when dialect matches doesn't all the mentioned
   * dialects
   */
  unlessDialect(
    dialect: DialectContract['name'] | DialectContract['name'][],
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this

  /**
   * Get rows back as a plain javascript object and not an array
   * of model instances
   */
  pojo<T>(): ModelQueryBuilderContract<Model, T>
}

/**
 * Shape of model keys
 */
export interface ModelKeysContract {
  add(key: string, value: string): void
  get(key: string, defaultValue: string): string
  get(key: string, defaultValue?: string): string | undefined
  resolve(key: string): string
  all(): ModelObject
}

/**
 * ------------------------------------------------------
 * Shape of Model instance
 * ------------------------------------------------------
 */

/**
 * Shape of the model instance. We prefix the properties with a `$` to
 * differentiate between special properties provided by the base
 * model but with exception to `save`, `delete`, `fill`, `merge`
 * and `toJSON`.
 *
 * @note: Since the interface name appears next to the inherited model
 *        methods, we have to choose a succinct name
 */
export interface LucidRow {
  $attributes: ModelObject
  $extras: ModelObject
  $original: ModelObject
  $preloaded: { [relation: string]: LucidRow | LucidRow[] }

  /**
   * Columns is a property to get type information for model
   * attributes. This must be declared by the end user
   */
  $columns: undefined

  $sideloaded: ModelObject
  $primaryKeyValue?: number | string
  $isPersisted: boolean
  $isNew: boolean
  $isLocal: boolean
  $dirty: ModelObject
  $isDirty: boolean
  $isDeleted: boolean

  $options?: ModelOptions
  $trx?: TransactionClientContract
  $setOptionsAndTrx(options?: ModelAdapterOptions): void

  useTransaction(trx: TransactionClientContract): this
  useConnection(connection: string): this

  /**
   * Gives an option to the end user to define constraints for update, insert
   * and delete queries. Since the query builder for these queries aren't
   * exposed to the end user, this method opens up the API to build
   * custom queries.
   */
  $getQueryFor(
    action: 'insert',
    client: QueryClientContract
  ): ReturnType<QueryClientContract['insertQuery']>
  $getQueryFor(
    action: 'update' | 'delete' | 'refresh',
    client: QueryClientContract
  ): ModelQueryBuilderContract<LucidModel>

  /**
   * Read/write attributes. Following methods are intentionally loosely typed,
   * so that one can bypass the public facing API and type checking for
   * advanced use cases
   */
  $setAttribute(key: string, value: any): void
  $getAttribute(key: string): any
  $getAttributeFromCache(key: string, callback: CacheNode['getter']): any

  /**
   * Read/write realtionships. Following methods are intentionally loosely typed,
   * so that one can bypass the public facing API and type checking for
   * advanced use cases
   */
  $hasRelated(key: string): boolean
  $setRelated(key: string, result: OneOrMany<LucidRow> | null): void
  $pushRelated(key: string, result: OneOrMany<LucidRow> | null): void
  $getRelated(key: string, defaultValue?: any): OneOrMany<LucidRow> | undefined | null

  /**
   * Consume the adapter result and hydrate the model
   */
  $consumeAdapterResult(adapterResult: ModelObject, sideloadAttributes?: ModelObject): void
  $hydrateOriginals(): void

  fill(value: Partial<ModelAttributes<this>>, allowExtraProperties?: boolean): this
  merge(value: Partial<ModelAttributes<this>>, allowExtraProperties?: boolean): this

  /**
   * Enable force update even when no attributes
   * are dirty
   */
  enableForceUpdate(): this

  /**
   * Actions to perform on the instance
   */
  save(): Promise<this>

  /**
   * The lockForUpdate method re-fetches the model instance from
   * the database and locks the row to perform an update. The
   * provided callback receives a fresh user instance and should
   * use that to perform an update.
   */
  lockForUpdate<T>(callback: (user: this) => Promise<T> | T): Promise<T>

  /**
   * Perform delete by issuing a delete request on the adapter
   */
  delete(): Promise<void>

  /**
   * Reload/Refresh the model instance
   */
  refresh(): Promise<this>

  /**
   * Load relationships onto the instance
   */
  load: LucidRowPreload<this>

  /**
   * Alias for "load"
   * @deprecated
   */
  preload: LucidRowPreload<this>

  /**
   * Load aggregates
   */
  loadAggregate: <
    Self extends this,
    Name extends ExtractModelRelations<Self>,
    RelatedBuilder = Self[Name] extends ModelRelations<LucidModel, LucidModel>
      ? Self[Name]['subQuery']
      : never,
  >(
    name: Name,
    callback: (builder: RelatedBuilder) => void
  ) => LazyLoadAggregatesContract<Self>

  /**
   * Load count
   */
  loadCount: <
    Self extends this,
    Name extends ExtractModelRelations<Self>,
    RelatedBuilder = Self[Name] extends ModelRelations<LucidModel, LucidModel>
      ? Self[Name]['subQuery']
      : never,
  >(
    name: Name,
    callback?: (builder: RelatedBuilder) => void
  ) => LazyLoadAggregatesContract<Self>

  /**
   * Serialize attributes to a plain object
   */
  serializeAttributes(fields?: CherryPickFields, raw?: boolean): ModelObject

  /**
   * Serialize computed properties to a plain object
   */
  serializeComputed(fields?: CherryPickFields): ModelObject

  /**
   * Serialize relationships to key-value pair of model instances and
   * their serializeAs keys
   */
  serializeRelations(fields: undefined, raw: true): { [key: string]: LucidRow | LucidRow[] }

  /**
   * Serialize relationships to key-value pair of plain nested objects
   */
  serializeRelations(
    cherryPick: CherryPick['relations'] | undefined,
    raw: false | undefined
  ): ModelObject

  serializeRelations(cherryPick?: CherryPick['relations'], raw?: boolean): ModelObject

  /**
   * Serialize model to a plain object
   */
  serialize(cherryPick?: CherryPick): ModelObject

  /**
   * Converts model to an object. It just returns the properties
   * of the model, along with preloaded relationships
   */
  toObject(): ModelObject

  /**
   * Serialize everything
   */
  toJSON(): ModelObject

  /**
   * Returns related model for a given relationship
   */
  related<Name extends ExtractModelRelations<this>>(
    relation: Name
  ): this[Name] extends ModelRelations<LucidModel, LucidModel> ? this[Name]['client'] : never
}

/**
 * ------------------------------------------------------
 * Shape of Model constructor
 * ------------------------------------------------------
 */

/**
 * Shape of the model static properties. The `$` prefix is to denote
 * special properties from the base model.
 *
 * @note: Since the interface name appears next to the inherited model
 *        methods, we have to choose a succinct name
 */
export interface LucidModel {
  /**
   * Whether or not model has been booted. After this model configurations
   * are ignored
   */
  readonly booted: boolean

  /**
   * A map of defined columns
   */
  $columnsDefinitions: Map<string, ModelColumnOptions>

  /**
   * A map of defined relationships
   */
  $relationsDefinitions: Map<string, RelationshipsContract>

  /**
   * A map of computed properties
   */
  $computedDefinitions: Map<string, ComputedOptions>

  /**
   * The primary key for finding unique referencing to a
   * model
   */
  primaryKey: string

  /**
   * Custom database connection to use
   */
  connection?: string

  /**
   * Naming strategy to use
   */
  namingStrategy: NamingStrategyContract

  /**
   * Database table to use
   */
  table: string

  /**
   * Self assign the primary instead of relying on the database to
   * return it back
   */
  selfAssignPrimaryKey: boolean

  /**
   * Adapter to work as a bridge between query builder and the model
   */
  $adapter: AdapterContract

  /**
   * Define an adapter to use for interacting with
   * the database
   */
  useAdapter(adapter: AdapterContract): void

  /**
   * Reference to hooks
   */
  $hooks: Hooks<any>

  /**
   * A copy of internal keys mapping. One should be able to resolve between
   * all key versions
   */
  $keys: {
    attributesToColumns: ModelKeysContract
    attributesToSerialized: ModelKeysContract
    columnsToAttributes: ModelKeysContract
    columnsToSerialized: ModelKeysContract
    serializedToColumns: ModelKeysContract
    serializedToAttributes: ModelKeysContract
  }

  /**
   * Creating model from adapter results
   */
  $createFromAdapterResult<T extends LucidModel>(
    this: T,
    result?: ModelObject,
    sideloadAttributes?: ModelObject,
    options?: ModelAdapterOptions
  ): null | InstanceType<T>

  /**
   * Creating multiple model instances from an array of adapter
   * result
   */
  $createMultipleFromAdapterResult<T extends LucidModel>(
    this: T,
    results: ModelObject[],
    sideloadAttributes?: ModelObject,
    options?: ModelAdapterOptions
  ): InstanceType<T>[]

  /**
   * Managing columns
   */
  $addColumn(name: string, options: Partial<ColumnOptions>): ColumnOptions
  $hasColumn(name: string): boolean
  $getColumn(name: string): ModelColumnOptions | undefined

  /**
   * Managing computed columns
   */
  $addComputed(name: string, options: Partial<ComputedOptions>): ComputedOptions
  $hasComputed(name: string): boolean
  $getComputed(name: string): ComputedOptions | undefined

  /**
   * Managing relationships
   */
  $addRelation(
    name: string,
    type: ModelRelationTypes['__opaque_type'],
    relatedModel: () => LucidModel,
    options: ModelRelationOptions
  ): void

  /**
   * Find if a relationship exists
   */
  $hasRelation(name: string): boolean

  /**
   * Get relationship declaration
   */
  $getRelation<Model extends LucidModel, Name extends ExtractModelRelations<InstanceType<Model>>>(
    this: Model,
    name: Name
  ): InstanceType<Model>[Name] extends ModelRelations<LucidModel, LucidModel>
    ? InstanceType<Model>[Name]['client']['relation']
    : RelationshipsContract
  $getRelation<Model extends LucidModel>(this: Model, name: string): RelationshipsContract

  /**
   * Define a static property on the model using the inherit or
   * define strategy.
   *
   * Inherit strategy will clone the property from the parent model
   * and will set it on the current model
   */
  $defineProperty<Model extends LucidModel, Prop extends keyof Model>(
    this: Model,
    propertyName: Prop,
    defaultValue: Model[Prop],
    strategy: 'inherit' | 'define' | ((value: Model[Prop]) => Model[Prop])
  ): void

  /**
   * Boot model
   */
  boot(): void

  /**
   * Register a before hook
   */
  before<Model extends LucidModel, Event extends 'find' | 'fetch'>(
    this: Model,
    event: Event,
    handler: HooksHandler<ModelQueryBuilderContract<Model>, Event>
  ): void
  before<Model extends LucidModel>(
    this: Model,
    event: 'paginate',
    handler: HooksHandler<
      [ModelQueryBuilderContract<Model>, ModelQueryBuilderContract<Model>],
      'paginate'
    >
  ): void
  before<Model extends LucidModel, Event extends EventsList>(
    this: Model,
    event: Event,
    handler: HooksHandler<InstanceType<Model>, Event>
  ): void

  /**
   * Register an after hook
   */
  after<Model extends LucidModel>(
    this: Model,
    event: 'fetch',
    handler: HooksHandler<InstanceType<Model>[], 'fetch'>
  ): void
  after<Model extends LucidModel>(
    this: Model,
    event: 'paginate',
    handler: HooksHandler<ModelPaginatorContract<InstanceType<Model>>, 'paginate'>
  ): void
  after<Model extends LucidModel, Event extends EventsList>(
    this: Model,
    event: Event,
    handler: HooksHandler<InstanceType<Model>, Event>
  ): void

  /**
   * Create model and return its instance back
   */
  create<T extends LucidModel>(
    this: T,
    values: Partial<ModelAttributes<InstanceType<T>>>,
    options?: ModelAssignOptions
  ): Promise<InstanceType<T>>

  /**
   * Create many of model instances
   */
  createMany<T extends LucidModel>(
    this: T,
    values: Partial<ModelAttributes<InstanceType<T>>>[],
    options?: ModelAssignOptions
  ): Promise<InstanceType<T>[]>

  /**
   * Find one using the primary key
   */
  find<T extends LucidModel>(
    this: T,
    value: any,
    options?: ModelAdapterOptions
  ): Promise<null | InstanceType<T>>

  /**
   * Find one using the primary key or fail
   */
  findOrFail<T extends LucidModel>(
    this: T,
    value: any,
    options?: ModelAdapterOptions
  ): Promise<InstanceType<T>>

  /**
   * Find one using a clause
   */
  findBy<T extends LucidModel>(
    this: T,
    clause: Record<string, unknown>,
    options?: ModelAdapterOptions
  ): Promise<null | InstanceType<T>>

  /**
   * Find one using a key-value pair
   */
  findBy<T extends LucidModel>(
    this: T,
    key: string,
    value: any,
    options?: ModelAdapterOptions
  ): Promise<null | InstanceType<T>>

  /**
   * Find one using a clause or fail
   */
  findByOrFail<T extends LucidModel>(
    this: T,
    clause: Record<string, unknown>,
    options?: ModelAdapterOptions
  ): Promise<InstanceType<T>>

  /**
   * Find one using a key-value pair or fail
   */
  findByOrFail<T extends LucidModel>(
    this: T,
    key: string,
    value: any,
    options?: ModelAdapterOptions
  ): Promise<InstanceType<T>>

  /**
   * Find multiple models instance using a clause
   */
  findManyBy<T extends LucidModel>(
    this: T,
    clause: Record<string, unknown>,
    options?: ModelAdapterOptions
  ): Promise<InstanceType<T>[]>

  /**
   * Find multiple models instance using a key/value pair
   */
  findManyBy<T extends LucidModel>(
    this: T,
    key: string,
    value: any,
    options?: ModelAdapterOptions
  ): Promise<InstanceType<T>[]>

  /**
   * Same as `query().first()`
   */
  first<T extends LucidModel>(
    this: T,
    options?: ModelAdapterOptions
  ): Promise<null | InstanceType<T>>

  /**
   * Same as `query().firstOrFail()`
   */
  firstOrFail<T extends LucidModel>(
    this: T,
    options?: ModelAdapterOptions
  ): Promise<InstanceType<T>>

  /**
   * Find many using an array of primary keys
   */
  findMany<T extends LucidModel>(
    this: T,
    value: any[],
    options?: ModelAdapterOptions
  ): Promise<InstanceType<T>[]>

  /**
   * Returns the first row or create a new instance of model without
   * persisting it
   */
  firstOrNew<T extends LucidModel>(
    this: T,
    searchPayload: Partial<ModelAttributes<InstanceType<T>>>,
    savePayload?: Partial<ModelAttributes<InstanceType<T>>>,
    options?: ModelAssignOptions
  ): Promise<InstanceType<T>>

  /**
   * Returns the first row or save it to the database
   */
  firstOrCreate<T extends LucidModel>(
    this: T,
    searchPayload: Partial<ModelAttributes<InstanceType<T>>>,
    savePayload?: Partial<ModelAttributes<InstanceType<T>>>,
    options?: ModelAssignOptions
  ): Promise<InstanceType<T>>

  /**
   * Returns the first row or save it to the database
   */
  updateOrCreate<T extends LucidModel>(
    this: T,
    searchPayload: Partial<ModelAttributes<InstanceType<T>>>,
    updatePayload: Partial<ModelAttributes<InstanceType<T>>>,
    options?: ModelAssignOptions
  ): Promise<InstanceType<T>>

  /**
   * Find rows or create in-memory instances of the missing
   * one's.
   */
  fetchOrNewUpMany<T extends LucidModel>(
    this: T,
    predicate: keyof ModelAttributes<InstanceType<T>> | (keyof ModelAttributes<InstanceType<T>>)[],
    payload: Partial<ModelAttributes<InstanceType<T>>>[],
    options?: ModelAssignOptions
  ): Promise<InstanceType<T>[]>

  /**
   * Find rows or create many when missing. One db call is invoked
   * for each create
   */
  fetchOrCreateMany<T extends LucidModel>(
    this: T,
    predicate: keyof ModelAttributes<InstanceType<T>> | (keyof ModelAttributes<InstanceType<T>>)[],
    payload: Partial<ModelAttributes<InstanceType<T>>>[],
    options?: ModelAssignOptions
  ): Promise<InstanceType<T>[]>

  /**
   * Update existing rows or create new one's.
   */
  updateOrCreateMany<T extends LucidModel>(
    this: T,
    predicate: keyof ModelAttributes<InstanceType<T>> | (keyof ModelAttributes<InstanceType<T>>)[],
    payload: Partial<ModelAttributes<InstanceType<T>>>[],
    options?: ModelAssignOptions
  ): Promise<InstanceType<T>[]>

  /**
   * Fetch all rows
   */
  all<T extends LucidModel>(this: T, options?: ModelAdapterOptions): Promise<InstanceType<T>[]>

  /**
   * Returns the query for fetching a model instance
   */
  query<Model extends LucidModel, Result = InstanceType<Model>>(
    this: Model,
    options?: ModelAdapterOptions
  ): ModelQueryBuilderContract<Model, Result>

  /**
   * Truncate model table
   */
  truncate(cascade?: boolean): Promise<void>

  new (): LucidRow
}

/**
 * ------------------------------------------------------
 * Database Adapter
 * ------------------------------------------------------
 */

/**
 * Every adapter must adhere to the Adapter contract
 */
export interface AdapterContract {
  /**
   * Returns query client for a model instance by inspecting it's options
   */
  modelClient(instance: LucidRow): QueryClientContract

  /**
   * Returns query client for a model constructor
   */
  modelConstructorClient(
    modelConstructor: LucidModel,
    options?: ModelAdapterOptions
  ): QueryClientContract

  /**
   * Delete model instance
   */
  delete(instance: LucidRow): Promise<void>

  /**
   * Refresh model instance to reflect new values
   * from the database
   */
  refresh(instance: LucidRow): Promise<void>

  /**
   * Perform insert
   */
  insert(instance: LucidRow, attributes: ModelObject): Promise<void>

  /**
   * Perform update
   */
  update(instance: LucidRow, attributes: ModelObject): Promise<void>

  /**
   * Must return the query builder for the model
   */
  query(
    modelConstructor: LucidModel,
    options?: ModelAdapterOptions
  ): ModelQueryBuilderContract<LucidModel, LucidRow>
}

/**
 * Naming strategy for model
 */
export interface NamingStrategyContract {
  /**
   * The default table name for the given model
   */
  tableName(model: LucidModel): string

  /**
   * The database column name for a given model attribute
   */
  columnName(model: LucidModel, attributeName: string): string

  /**
   * The post serialization name for a given model attribute
   */
  serializedName(model: LucidModel, attributeName: string): string

  /**
   * The local key for a given model relationship
   */
  relationLocalKey(
    relation: ModelRelations<LucidModel, LucidModel>['__opaque_type'],
    model: LucidModel,
    relatedModel: LucidModel,
    relationName: string
  ): string

  /**
   * The foreign key for a given model relationship
   */
  relationForeignKey(
    relation: ModelRelations<LucidModel, LucidModel>['__opaque_type'],
    model: LucidModel,
    relatedModel: LucidModel,
    relationName: string
  ): string

  /**
   * Pivot table name for many to many relationship
   */
  relationPivotTable(
    relation: 'manyToMany',
    model: LucidModel,
    relatedModel: LucidModel,
    relationName: string
  ): string

  /**
   * Pivot foreign key for many to many relationship
   */
  relationPivotForeignKey(
    relation: 'manyToMany',
    model: LucidModel,
    relatedModel: LucidModel,
    relationName: string
  ): string

  /**
   * Keys for the pagination meta
   */
  paginationMetaKeys(): SimplePaginatorMetaKeys
}
