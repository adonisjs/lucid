/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Model' {
  import { DateTime } from 'luxon'
  import { Hooks } from '@poppinss/hooks'
  import { ProfilerContract, ProfilerRowContract } from '@ioc:Adonis/Core/Profiler'
  import {
    Update,
    Counter,
    OneOrMany,
    Aggregate,
    ChainableContract,
    SimplePaginatorContract,
    ExcutableQueryBuilderContract,
  } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

  import {
    QueryClientContract,
    TransactionClientContract,
  } from '@ioc:Adonis/Lucid/Database'

  import {
    ModelRelations,
    RelationOptions,
    PreloaderContract,
    ModelRelationTypes,
    QueryBuilderPreloadFn,
    RelationshipsContract,
    ExtractModelRelations,
    ThroughRelationOptions,
    ManyToManyRelationOptions,
  } from '@ioc:Adonis/Lucid/Relations'

  /**
   * ------------------------------------------------------
   *  Helpers
   * ------------------------------------------------------
   */

  /**
   * Same as [[Parameters]] but omits the first parameter
   */
  type OmitFirst<T extends (...args: any) => any> = T extends (x: any, ...args: infer P) => any ? P : never

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
  export type TypedDecorator<PropType> = <TKey extends string, TTarget extends { [K in TKey]: PropType }>(
    target: TTarget,
    property: TKey,
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
        [P in keyof Model]: P extends keyof LucidRow
          ? never
          : Model[P] extends Function | ModelRelationTypes ? never : P
      }[keyof Model]]: Model[Filtered]
    }
    : Model['$columns']

  /**
   * Extract the query scopes of a model
   */
  export type ExtractScopes<Model extends any> = {
    [Scope in keyof PickProperties<Model, QueryScope<QueryScopeCallback>>]: (
      ...args: OmitFirst<Model[Scope]>
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
    original: any,
    resolved: any,
    getter: (value: any) => any,
  }

  /**
   * List of events for which a model will trigger hooks
   */
  export type EventsList = 'save' | 'create' | 'update' | 'delete' | 'fetch' | 'find'
  export type HooksHandler<
    Data extends any,
    Event extends EventsList,
  > = ((data: Data, event: Event) => Promise<void> | void) | string

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
    ...args: any[],
  ) => void

  /**
   * Query scope
   */
  export type QueryScope<Scope extends QueryScopeCallback> = Scope & { readonly isQueryScope: true }

  /**
   * A function to mark a method as query scope
   */
  export type ScopeFn = <
    Model extends LucidModel,
    Scope extends QueryScopeCallback = QueryScopeCallback<Model>,
  >(callback: Scope) => QueryScope<Scope>

  /**
   * ------------------------------------------------------
   * Decorators and Options
   * ------------------------------------------------------
   */

  /**
   * Options for defining a column
   */
  export type ColumnOptions = {
    columnName: string, // database column name
    serializeAs: string | null, // null means do not serialize column
    isPrimary: boolean,
    meta?: any,

    /**
     * Invoked before serializing process happens
     */
    serialize?: (
      value: any,
      attribute: string,
      model: LucidRow,
    ) => any,

    /**
     * Invoked before create or update happens
     */
    prepare?: (
      value: any,
      attribute: string,
      model: LucidRow,
    ) => any,

    /**
     * Invoked when row is fetched from the database
     */
    consume?: (
      value: any,
      attribute: string,
      model: LucidRow,
    ) => any,
  }

  /**
   * Shape of column options after they have set on the model
   */
  export type ModelColumnOptions = ColumnOptions & {
    hasGetter: boolean,
    hasSetter: boolean,
  }

  /**
   * Represents a computed property on the model
   */
  export type ComputedOptions = {
    serializeAs: string | null,
    meta?: any,
  }

  /**
   * Options accepted by the Model.$addRelation method
   */
  export type ModelRelationOptions = RelationOptions<ModelRelations>
  | ManyToManyRelationOptions<ModelRelations>
  | ThroughRelationOptions<ModelRelations>

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
  export type DateColumnDecorator = (options?: Partial<ColumnOptions & {
    autoCreate: boolean,
    autoUpdate: boolean,
  }>) => TypedDecorator<DateTime>

  /**
   * Decorator for defining date time columns. It is same as
   * date column as of now
   */
  export type DateTimeColumnDecorator = DateColumnDecorator

  /**
   * ------------------------------------------------------
   * Model Options
   * ------------------------------------------------------
   */

  /**
   * Model options to be used when making queries
   */
  export type ModelOptions = {
    connection?: string,
    profiler?: ProfilerContract | ProfilerRowContract,
  }

  /**
   * Adapter also accepts a client directly
   */
  export type ModelAdapterOptions = ModelOptions & {
    client?: QueryClientContract,
  }

  /**
   * Preload function on a model instance
   */
  interface ModelBuilderPreloadFn<
    Model extends LucidRow,
  > extends QueryBuilderPreloadFn<Model, Promise<void>> {
    (callback: (preloader: PreloaderContract<Model>) => void): Promise<void>
  }

  /**
   * ------------------------------------------------------
   * Model Query Builder
   * ------------------------------------------------------
   */

  /**
   * Model query builder will have extras methods on top of the Database query builder
   */
  export interface ModelQueryBuilderContract<
    Model extends LucidModel,
    Result extends any = InstanceType<Model>
  >
    extends ChainableContract, ExcutableQueryBuilderContract<Result[]>
  {
    model: Model

    /**
     * Whether or not the query is a subquery generated for `.where`
     * callbacks
     */
    isSubQuery: boolean

    /**
     * Apply user defined query scopes
     */
    apply<Scopes extends ExtractScopes<Model>> (
      callback: (scopes: Scopes) => void
    ): this

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
    clone<ClonedResult = Result> (): ModelQueryBuilderContract<Model, ClonedResult>

    /**
     * A custom set of sideloaded properties defined on the query
     * builder, this will be passed to the model instance created
     * by the query builder
     */
    sideload (value: ModelObject): this

    /**
     * Execute and get first result
     */
    first (): Promise<Result | null>

    /**
     * Return the first matching row or fail
     */
    firstOrFail (): Promise<Result>

    /**
     * Perform delete operation
     */
    del (): ModelQueryBuilderContract<Model, number>

    /**
     * Execute query with pagination
     */
    paginate (page: number, perPage?: number): Promise<SimplePaginatorContract<Result[]>>

    /**
     * Mutations (update and increment can be one query aswell)
     */
    update: Update<ModelQueryBuilderContract<Model, number>>
    increment: Counter<ModelQueryBuilderContract<Model, number>>
    decrement: Counter<ModelQueryBuilderContract<Model, number>>

    /**
     * Define relationships to be preloaded
     */
    preload: QueryBuilderPreloadFn<InstanceType<Model>, this>

    /**
     * Aggregates
     */
    count: Aggregate<ModelQueryBuilderContract<Model, any>>
    countDistinct: Aggregate<ModelQueryBuilderContract<Model, any>>
    min: Aggregate<ModelQueryBuilderContract<Model, any>>
    max: Aggregate<ModelQueryBuilderContract<Model, any>>
    sum: Aggregate<ModelQueryBuilderContract<Model, any>>
    avg: Aggregate<ModelQueryBuilderContract<Model, any>>
    avgDistinct: Aggregate<ModelQueryBuilderContract<Model, any>>
  }

  /**
   * Shape of model keys
   */
  export interface ModelKeysContract {
    add (key: string, value: string): void
    get (key: string, defaultValue: string): string
    get (key: string, defaultValue?: string): string | undefined
    resolve (key: string): string
    all (): ModelObject
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
   *        methods, we have to choose a sunnict name
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
    $trx?: TransactionClientContract,
    $setOptionsAndTrx (options?: ModelAdapterOptions): void

    /**
     * Gives an option to the end user to define constraints for update, insert
     * and delete queries. Since the query builder for these queries aren't
     * exposed to the end user, this method opens up the API to build
     * custom queries.
     */
    $getQueryFor (
      action: 'insert',
      client: QueryClientContract,
    ): ReturnType<QueryClientContract['insertQuery']>
    $getQueryFor (
      action: 'update' | 'delete',
      client: QueryClientContract,
    ): ReturnType<QueryClientContract['query']>

    /**
     * Read/write attributes. Following methods are intentionally loosely typed,
     * so that one can bypass the public facing API and type checking for
     * advanced use cases
     */
    $setAttribute (key: string, value: any): void
    $getAttribute (key: string): any
    $getAttributeFromCache (key: string, callback: CacheNode['getter']): any

    /**
     * Read/write realtionships. Following methods are intentionally loosely typed,
     * so that one can bypass the public facing API and type checking for
     * advanced use cases
     */
    $hasRelated (key: string): boolean
    $setRelated (key: string, result: OneOrMany<LucidRow>): void
    $pushRelated (key: string, result: OneOrMany<LucidRow>): void
    $getRelated (key: string, defaultValue?: any): OneOrMany<LucidRow> | undefined

    /**
     * Consume the adapter result and hydrate the model
     */
    $consumeAdapterResult (adapterResult: ModelObject, sideloadAttributes?: ModelObject): void
    $hydrateOriginals(): void

    fill (value: Partial<ModelAttributes<this>>, ignoreUndefined?: boolean): void
    merge (value: Partial<ModelAttributes<this>>, ignoreUndefined?: boolean): void
    save (): Promise<void>
    delete (): Promise<void>
    refresh (): Promise<void>
    preload: ModelBuilderPreloadFn<this>

    /**
     * Serialize attributes to a plain object
     */
    serializeAttributes (fieldsToCherryPick?: ModelObject, raw?: boolean): ModelObject

    /**
     * Serialize computed properties to a plain object
     */
    serializeComputed (fieldsToCherryPick?: string[]): ModelObject

    /**
     * Serialize relationships to key-value pair of model instances and
     * their serializeAs keys
     */
    serializeRelations (
      fieldsToCherryPick: ModelObject | undefined,
      raw: true,
    ): { [key: string]: LucidRow | LucidRow[] }

    /**
     * Serialize relationships to key-value pair of plain nested objects
     */
    serializeRelations (
      fieldsToCherryPick: ModelObject | undefined,
      raw: false | undefined,
    ): ModelObject

    serializeRelations (fieldsToCherryPick?: ModelObject, raw?: boolean): ModelObject

    /**
     * Serialize model to a plain object
     */
    serialize (fieldsToCherryPick?: ModelObject): ModelObject

    /**
     * Serialize everything
     */
    toJSON (): ModelObject

    /**
     * Returns related model for a given relationship
     */
    related<Name extends ExtractModelRelations<this>> (
      relation: Name,
    ): this[Name] extends ModelRelations ? this[Name]['client'] : never
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
   *        methods, we have to choose a sunnict name
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
     * Database table to use
     */
    table: string

    /**
     * Adapter to work as a bridge between query builder and the model
     */
    $adapter: AdapterContract

    /**
     * Reference to hooks
     */
    $hooks: Hooks

    /**
     * Used to construct defaults for the model
     */
    $configurator: OrmConfigContract,

    /**
     * A copy of internal keys mapping. One should be able to resolve between
     * all key versions
     */
    $keys: {
      attributesToColumns: ModelKeysContract,
      attributesToSerialized: ModelKeysContract,
      columnsToAttributes: ModelKeysContract,
      columnsToSerialized: ModelKeysContract,
      serializedToColumns: ModelKeysContract,
      serializedToAttributes: ModelKeysContract,
    }

    /**
     * Creating model from adapter results
     */
    $createFromAdapterResult<T extends LucidModel> (
      this: T,
      result?: ModelObject,
      sideloadAttributes?: ModelObject,
      options?: ModelAdapterOptions,
    ): null | InstanceType<T>

    /**
     * Creating multiple model instances from an array of adapter
     * result
     */
    $createMultipleFromAdapterResult<T extends LucidModel> (
      this: T,
      results: ModelObject[],
      sideloadAttributes?: ModelObject,
      options?: ModelAdapterOptions,
    ): InstanceType<T>[]

    /**
     * Managing columns
     */
    $addColumn (name: string, options: Partial<ColumnOptions>): ColumnOptions
    $hasColumn (name: string): boolean
    $getColumn (name: string): ModelColumnOptions | undefined

    /**
     * Managing computed columns
     */
    $addComputed (name: string, options: Partial<ComputedOptions>): ComputedOptions
    $hasComputed (name: string): boolean
    $getComputed (name: string): ComputedOptions | undefined

    /**
     * Managing relationships
     */
    $addRelation (
      name: string,
      type: ModelRelations['type'],
      relatedModel: () => LucidModel,
      options: ModelRelationOptions,
    ): void

    /**
     * Find if a relationship exists
     */
    $hasRelation (name: string): boolean

    /**
     * Get relationship declaration
     */
    $getRelation<
      Model extends LucidModel,
      Name extends ExtractModelRelations<InstanceType<Model>>
    > (
      this: Model,
      name: Name | string,
    ): (InstanceType<Model>[Name] extends ModelRelations
      ? InstanceType<Model>[Name]['client']['relation']
      : RelationshipsContract) | undefined

    /**
     * Boot model
     */
    boot (): void

    /**
     * Register a before hook
     */
    before<Model extends LucidModel, Event extends 'find' | 'fetch'> (
      this: Model,
      event: Event,
      handler: HooksHandler<ModelQueryBuilderContract<Model>, Event>,
    ): void
    before<Model extends LucidModel, Event extends EventsList> (
      this: Model,
      event: Event,
      handler: HooksHandler<InstanceType<Model>, Event>,
    ): void

    /**
     * Register an after hook
     */
    after<Model extends LucidModel> (
      this: Model,
      event: 'fetch',
      handler: HooksHandler<InstanceType<Model>[], 'fetch'>,
    ): void
    after<Model extends LucidModel, Event extends EventsList> (
      this: Model,
      event: Event,
      handler: HooksHandler<InstanceType<Model>, Event>,
    ): void

    /**
     * Create model and return its instance back
     */
    create<T extends LucidModel> (
      this: T,
      values: Partial<ModelAttributes<InstanceType<T>>>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Create many of model instances
     */
    createMany<T extends LucidModel> (
      this: T,
      values: Partial<ModelAttributes<InstanceType<T>>>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Find one using the primary key
     */
    find<T extends LucidModel> (
      this: T,
      value: any,
      options?: ModelAdapterOptions,
    ): Promise<null | InstanceType<T>>

    /**
     * Find one using the primary key or fail
     */
    findOrFail<T extends LucidModel> (
      this: T,
      value: any,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Find many using an array of primary keys
     */
    findMany<T extends LucidModel> (
      this: T,
      value: any[],
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Returns the first row or create a new instance of model without
     * persisting it
     */
    firstOrNew<T extends LucidModel> (
      this: T,
      search: Partial<ModelAttributes<InstanceType<T>>>,
      savePayload?: Partial<ModelAttributes<InstanceType<T>>>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Returns the first row or save it to the database
     */
    firstOrCreate<T extends LucidModel> (
      this: T,
      search: Partial<ModelAttributes<InstanceType<T>>>,
      savePayload?: Partial<ModelAttributes<InstanceType<T>>>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Find rows or create in-memory instances of the missing
     * one's.
     */
    fetchOrNewUpMany<T extends LucidModel> (
      this: T,
      uniqueKey: keyof ModelAttributes<InstanceType<T>>,
      payload: Partial<ModelAttributes<InstanceType<T>>>[],
      options?: ModelAdapterOptions,
      mergeAttributes?: boolean,
    ): Promise<InstanceType<T>[]>

    /**
     * Find rows or create many when missing. One db call is invoked
     * for each create
     */
    fetchOrCreateMany<T extends LucidModel> (
      this: T,
      uniqueKey: keyof ModelAttributes<InstanceType<T>>,
      payload: Partial<ModelAttributes<InstanceType<T>>>[],
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Returns the first row or save it to the database
     */
    updateOrCreate<T extends LucidModel> (
      this: T,
      search: Partial<ModelAttributes<InstanceType<T>>>,
      updatePayload: Partial<ModelAttributes<InstanceType<T>>>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Update existing rows or create new one's.
     */
    updateOrCreateMany<T extends LucidModel> (
      this: T,
      uniqueKey: keyof ModelAttributes<InstanceType<T>>,
      payload: Partial<ModelAttributes<InstanceType<T>>>[],
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Fetch all rows
     */
    all<T extends LucidModel> (
      this: T,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Returns the query for fetching a model instance
     */
    query<
      Model extends LucidModel,
      Result extends any = InstanceType<Model>,
    > (
      this: Model,
      options?: ModelAdapterOptions,
    ): ModelQueryBuilderContract<Model, Result>

    /**
     * Truncate model table
     */
    truncate (cascade?: boolean): Promise<void>

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
    modelClient (instance: LucidRow): QueryClientContract

    /**
     * Returns query client for a model constructor
     */
    modelConstructorClient (
      modelConstructor: LucidModel,
      options?: ModelAdapterOptions,
    ): QueryClientContract

    /**
     * Delete model instance
     */
    delete (instance: LucidRow): Promise<void>

    /**
     * Perform insert
     */
    insert (instance: LucidRow, attributes: ModelObject): Promise<void>

    /**
     * Perform update
     */
    update (instance: LucidRow, attributes: ModelObject): Promise<void>

    /**
     * Must return the query builder for the model
     */
    query (
      modelConstructor: LucidModel,
      options?: ModelAdapterOptions,
    ): ModelQueryBuilderContract<LucidModel, LucidRow>
  }

  /**
   * Shape of ORM config to have a standard place for computing
   * defaults
   */
  export type OrmConfigContract = {
    /**
     * Return the default table name for a given model
     */
    getTableName (model: LucidModel): string

    /**
     * Return the `columnName` for a given model
     */
    getColumnName (model: LucidModel, key: string): string

    /**
     * Return the `serializeAs` key for a given model property
     */
    getSerializeAsKey (model: LucidModel, key: string): string

    /**
     * Return the local key property name for a given relationship
     */
    getLocalKey (
      relation: ModelRelations['type'],
      model: LucidModel,
      relatedModel: LucidModel,
    ): string

    /**
     * Return the foreign key property name for a given relationship
     */
    getForeignKey (
      relation: ModelRelations['type'],
      model: LucidModel,
      relatedModel: LucidModel,
    ): string

    /**
     * Return the pivot table name for many to many relationship
     */
    getPivotTableName (
      relation: 'manyToMany',
      model: LucidModel,
      relatedModel: LucidModel,
      relationName: string,
    ): string

    /**
     * Return the pivot foreign key for many to many relationship
     */
    getPivotForeignKey (
      relation: 'manyToMany',
      model: LucidModel,
      relatedModel: LucidModel,
      relationName: string,
    ): string
  }
}
