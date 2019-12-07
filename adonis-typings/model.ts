/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Model' {
  import { ProfilerContract, ProfilerRowContract } from '@ioc:Adonis/Core/Profiler'
  import {
    Update,
    Counter,
    StrictValues,
    QueryCallback,
    ChainableContract,
  } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

  import {
    QueryClientContract,
    TransactionClientContract,
    ExcutableQueryBuilderContract,
  } from '@ioc:Adonis/Lucid/Database'

  /**
   * Represents a single column on the model
   */
  export type ColumnNode = {
    castAs: string,
    serializeAs: string,
    serialize: boolean,
    primary: boolean,
    hasGetter: boolean,
    hasSetter: boolean,
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
   * Represents a computed property on the model
   */
  export type ComputedNode = {
    serializeAs: string,
  }

  /**
   * Shape of the relationships node
   */
  export interface BaseRelationNode {
    relatedModel: (() => ModelConstructorContract),
    localKey?: string,
    foreignKey?: string,
    serializeAs?: string,
  }

  /**
   * Shape of many to many relationship
   */
  export interface ManyToManyRelationNode {
    relatedModel: (() => ModelConstructorContract),
    pivotTable?: string,
    localKey?: string,
    pivotForeignKey?: string,
    relatedKey?: string,
    pivotRelatedForeignKey?: string,
    pivotColumns?: string[],
    serializeAs?: string,
  }

  /**
   * Shape of hasOneThrough relationship
   */
  export interface ThroughRelationNode extends BaseRelationNode {
    throughModel: (() => ModelConstructorContract)
    throughLocalKey?: string,
    throughForeignKey?: string,
  }

  /**
   * Reusable interface to define an object.
   */
  export interface ModelObject {
    [key: string]: any
  }

  /**
   * Model options to dictate query values
   */
  export type ModelOptions = {
    connection?: string,
    profiler?: ProfilerContract | ProfilerRowContract,
  }

  /**
   * Adapter and also accept a client directly
   */
  export type ModelAdapterOptions = ModelOptions & {
    client?: QueryClientContract,
  }

  /**
   * Generic return function of a decorator
   */
  type DecoratorFn = (target, property) => void

  /**
   * Model query builder with applied executable trait
   */
  type ModelExecuteableQueryBuilder = ModelQueryBuilderContract<any> & ExcutableQueryBuilderContract<any>

  /**
   * Types for decorators
   */
  export type ColumnFn = (column?: Partial<ColumnNode>) => DecoratorFn
  export type ComputedFn = (column?: Partial<ComputedNode>) => DecoratorFn

  type BaseRelationDecoratorNode = Omit<BaseRelationNode, 'relatedModel'>

  /**
   * Decorator signature to define has one relationship
   */
  export type HasOneFn = (
    model: BaseRelationNode['relatedModel'],
    column?: BaseRelationDecoratorNode,
  ) => DecoratorFn

  /**
   * Decorator signature to define has many relationship
   */
  export type HasManyFn = (
    model: BaseRelationNode['relatedModel'],
    column?: BaseRelationDecoratorNode,
  ) => DecoratorFn

  /**
   * Decorator signature to define belongs to relationship
   */
  export type BelongsToFn = (
    model: BaseRelationNode['relatedModel'],
    column?: BaseRelationDecoratorNode,
  ) => DecoratorFn

  /**
   * Decorator signature to define many to many relationship
   */
  type ManyToManyRelationDecoratorNode = Omit<ManyToManyRelationNode, 'relatedModel'>
  export type ManyToManyFn = (
    model: ManyToManyRelationNode['relatedModel'],
    column?: ManyToManyRelationDecoratorNode,
  ) => DecoratorFn

  /**
   * Decorator signature to define has many through relationship
   */
  type ThroughRelationDecoratorNode = Omit<ThroughRelationNode, 'relatedModel' | 'throughModel'>
  export type HasManyThroughFn = (
    model: [ThroughRelationNode['relatedModel'], ThroughRelationNode['throughModel']],
    column?: ThroughRelationDecoratorNode,
  ) => DecoratorFn

  /**
   * List of available relations
   */
  export type AvailableRelations = 'hasOne' |
    'hasMany' |
    'belongsTo' |
    'manyToMany' |
    'hasManyThrough'

  /**
   * List of events for which a model will trigger hooks
   */
  export type EventsList = 'save' | 'create' | 'update' | 'delete'
  export type HooksHandler<T> = ((model: T) => Promise<void> | void) | string

  /**
   * Lookup map required for related method
   */
  type RelationsQueryBuildersMap<T, R extends any = T> = {
    'unknown': BaseRelationQueryBuilderContract<T> & ExcutableQueryBuilderContract<R[]>,
    'hasOne': HasOneQueryBuilderContract<T> & ExcutableQueryBuilderContract<R[]>,
    'hasMany': HasManyQueryBuilderContract<T> & ExcutableQueryBuilderContract<R[]>,
    'belongsTo': BelongsToQueryBuilderContract<T> & ExcutableQueryBuilderContract<R[]>,
    'manyToMany': ManyToManyQueryBuilderContract<T> & ExcutableQueryBuilderContract<R[]>,
    'hasManyThrough': HasManyThroughQueryBuilderContract<T> & ExcutableQueryBuilderContract<R[]>,
  }

  /**
   * Overloads for preload method
   */
  interface QueryBuilderPreloadFn<Builder extends any> {
    <T extends keyof RelationsQueryBuildersMap<ModelContract> = 'unknown'> (
      relation: string,
      callback?: (
        builder: RelationsQueryBuildersMap<ModelContract>[T],
      ) => void,
    ): Builder
  }

  /**
   * Preload function on a model instance
   */
  interface ModelBuilderPreloadFn extends QueryBuilderPreloadFn<Promise<void>> {
    (callback: (preloader: PreloaderContract) => void): Promise<void>
  }

  /**
   * Interface to be implemented by all relationship types
   */
  export interface RelationContract {
    type: AvailableRelations
    relationName: string
    serializeAs: string
    booted: boolean
    model: ModelConstructorContract

    boot (): void
    relatedModel (): ModelConstructorContract

    setRelated (model: ModelContract, related?: ModelContract | ModelContract[] | null): void
    setRelatedMany (models: ModelContract[], related: ModelContract[]): void

    getQuery (
      model: ModelContract,
      client: QueryClientContract,
    ): RelationQueryBuilderContract & ExcutableQueryBuilderContract<any>

    getEagerQuery (
      models: ModelContract[],
      client: QueryClientContract,
    ): RelationQueryBuilderContract & ExcutableQueryBuilderContract<any>
  }

  /**
   * Base query builder for all relations
   */
  export interface BaseRelationQueryBuilderContract<T> extends ModelQueryBuilderContract<any> {
    applyConstraints (): this

    /**
     * Execute and get first result
     */
    first (): Promise<T | null>

    /**
     * Return the first matching row or fail
     */
    firstOrFail (): Promise<T>

    /**
     * Save the related model.
     */
    save (model: T, wrapInTransaction?: boolean): Promise<void>

    /**
     * Save the related model.
     */
    saveMany (model: T[], wrapInTransaction?: boolean): Promise<void>
  }

  /**
   * A union of relation relations query builders
   */
  type RelationQueryBuilderContract<T extends any = ModelContract> = BelongsToQueryBuilderContract<T> |
    HasOneQueryBuilderContract<T> |
    HasManyQueryBuilderContract<T> |
    ManyToManyQueryBuilderContract<T> |
    HasManyThroughQueryBuilderContract<T>

  /**
   * Shae of has belongs to query builder contract
   */
  export interface BelongsToQueryBuilderContract<T> extends BaseRelationQueryBuilderContract<T> {
    /**
     * Associate related model.
     */
    associate (model: T, wrapInTransaction?: boolean): Promise<void>

    /**
     * Dissociate all relationships.
     */
    dissociate (): Promise<void>
  }

  /**
   * Shae of has one relationship query builder
   */
  export interface HasOneQueryBuilderContract<T> extends BaseRelationQueryBuilderContract<T> {
  }

  /**
   * Shae of has many relationship query builder
   */
  export interface HasManyQueryBuilderContract<T> extends BaseRelationQueryBuilderContract<T> {
  }

  /**
   * Possible signatures for adding a where clause
   */
  interface WherePivot<Builder extends ChainableContract> {
    (key: string, value: StrictValues | ChainableContract): Builder
    (key: string, operator: string, value: StrictValues | ChainableContract): Builder
  }

  /**
   * Possible signatures for adding where in clause.
   */
  interface WhereInPivot<Builder extends ChainableContract> {
    (K: string, value: (StrictValues | ChainableContract)[]): Builder
    (K: string[], value: (StrictValues | ChainableContract)[][]): Builder
    (k: string, subquery: ChainableContract | QueryCallback<Builder>): Builder
    (k: string[], subquery: ChainableContract): Builder
  }

  /**
   * Shape of many to many query builder. It has few methods over the standard
   * model query builder
   */
  export interface ManyToManyQueryBuilderContract<T> extends BaseRelationQueryBuilderContract<T> {
    pivotColumns (columns: string[]): this

    wherePivot: WherePivot<this>
    orWherePivot: WherePivot<this>
    andWherePivot: WherePivot<this>

    whereNotPivot: WherePivot<this>
    orWhereNotPivot: WherePivot<this>
    andWhereNotPivot: WherePivot<this>

    whereInPivot: WhereInPivot<this>
    orWhereInPivot: WhereInPivot<this>
    andWhereInPivot: WhereInPivot<this>

    whereNotInPivot: WhereInPivot<this>
    orWhereNotInPivot: WhereInPivot<this>
    andWhereNotInPivot: WhereInPivot<this>

    /**
     * Save related model
     */
    save (model: T, wrapInTransaction?: boolean, checkExisting?: boolean): Promise<void>

    /**
     * Save related many
     */
    saveMany (model: T[], wrapInTransaction?: boolean, checkExisting?: boolean): Promise<void>

    /**
     * Attach related
     */
    attach (
      ids: (string | number)[] | { [key: string]: any },
      checkExisting?: boolean,
    ): Promise<void>

    /**
     * Detach from pivot table
     */
    detach (ids: (string | number)[]): Promise<void>

    /**
     * Sync related ids
     */
    sync (
      ids: (string | number)[] | { [key: string]: any },
      wrapInTransaction?: boolean,
      checkExisting?: boolean,
    ): Promise<void>
  }

  /**
   * Shae of has many through relationship query builder
   */
  export interface HasManyThroughQueryBuilderContract<T> extends BaseRelationQueryBuilderContract<T> {
  }

  /**
   * Model query builder will have extras methods on top of Database query builder
   */
  export interface ModelQueryBuilderContract<
    Model extends ModelConstructorContract,
    Result extends any = InstanceType<Model>
  >
    extends ChainableContract
  {
    model: Model

    /**
     * A copy of client options. They can be set on any model instance
     */
    readonly clientOptions: ModelOptions

    /**
     * Reference to query client used for making queries
     */
    client: QueryClientContract

    /**
     * A custom set of sideloaded properties defined on the query
     * builder, this will be passed to the model instance created
     * by the query builder
     */
    sideload (value: ModelObject): this

    /**
     * The connection name used by the model query builder
     */
    connection: string

    /**
     * Execute and get first result
     */
    first (): Promise<Result | null>

    /**
     * Return the first matching row or fail
     */
    firstOrFail (): Promise<Result>

    /**
     * Mutations (update and increment can be one query aswell)
     */
    update: Update<ModelQueryBuilderContract<Model> & ExcutableQueryBuilderContract<number[]>>
    increment: Counter<ModelQueryBuilderContract<Model> & ExcutableQueryBuilderContract<number[]>>
    decrement: Counter<ModelQueryBuilderContract<Model> & ExcutableQueryBuilderContract<number[]>>
    del (): ModelQueryBuilderContract<Model> & ExcutableQueryBuilderContract<number[]>

    /**
     * Define relationships to be preloaded
     */
    preload: QueryBuilderPreloadFn<this>
  }

  /**
   * Shape of the model instance. We prefix the properties with a `$` to
   * differentiate between special properties provided by the base
   * model but with exception to `save`, `delete`, `fill`, `merge`
   * and `toJSON`.
   */
  export interface ModelContract {
    $attributes: ModelObject
    $extras: ModelObject
    $original: ModelObject
    $persisted: boolean
    $isNew: boolean
    $isLocal: boolean
    $dirty: ModelObject
    $isDirty: boolean
    $isDeleted: boolean
    $preloaded: { [relation: string]: ModelContract | ModelContract[] }
    $sideloaded: ModelObject
    $primaryKeyValue?: any
    $options?: ModelOptions
    $trx?: TransactionClientContract,

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
    $getQueryFor (
      action: 'insert' | 'delete' | 'update',
      client: QueryClientContract,
    ): ReturnType<QueryClientContract['query']> | ReturnType<QueryClientContract['insertQuery']>

    /**
     * Read/write attributes
     */
    $setAttribute (key: string, value: any)
    $getAttribute (key: string): any
    $getAttributeFromCache (key: string, callback: CacheNode['getter']): any

    /**
     * Read/write realtionships
     */
    $hasRelated (key: string): boolean
    $setRelated (key: string, result: ModelContract | ModelContract[]): void
    $getRelated (key: string, defaultValue?: any): ModelContract

    /**
     * Consume the adapter result and hydrate the model
     */
    $consumeAdapterResult (adapterResult: ModelObject, sideloadAttributes?: ModelObject): void

    fill (value: ModelObject): void
    merge (value: ModelObject): void

    preload: ModelBuilderPreloadFn

    save (): Promise<void>
    delete (): Promise<void>
    serialize (): ModelObject
    toJSON (): ModelObject
    refresh (): Promise<void>

    related<
      T extends keyof RelationsQueryBuildersMap<any> = 'unknown',
      K extends keyof this = keyof this,
      M extends any = this[K] extends ModelContract[] ? this[K][0] : this[K],
      R extends any = M
    > (relation: K): RelationsQueryBuildersMap<M, R>[T]
  }

  /**
   * Shape of the model static properties. The `$` prefix is to denote
   * special properties from the base model
   */
  export interface ModelConstructorContract {
    /**
     * Whether or not model has been booted. After this model configurations
     * are ignored
     */
    $booted: boolean

    /**
     * A map of defined columns
     */
    $columns: Map<string, ColumnNode>

    /**
     * A map of defined relationships
     */
    $relations: Map<string, RelationContract>

    /**
     * A map of defined computed properties
     */
    $computed: Map<string, ComputedNode>

    /**
     * The primary key for finding unique referencing to a
     * model
     */
    $primaryKey: string

    /**
     * Custom database connection to use
     */
    $connection?: string

    /**
     * Adapter to work as a bridge between query builder and the model
     */
    $adapter: AdapterContract

    /**
     * Whether primary key is auto incrementing or not. If not, then
     * end user must provide the value for the primary key
     */
    $increments: boolean

    /**
     * Database table to use
     */
    $table: string

    /**
     * Refs are named value pair on model used mainly for autocompleting
     * the query constraints
     */
    $refs: any

    $boot (): void

    /**
     * Register a before hook
     */
    $before<T extends ModelConstructorContract> (
      this: T,
      event: EventsList,
      handler: HooksHandler<InstanceType<T>>,
    )

    /**
     * Register an after hook
     */
    $after<T extends ModelConstructorContract> (
      this: T,
      event: EventsList,
      handler: HooksHandler<InstanceType<T>>,
    )

    /**
     * Creating model from adapter results
     */
    $createFromAdapterResult<T extends ModelConstructorContract> (
      this: T,
      result?: ModelObject,
      sideloadAttributes?: ModelObject,
      options?: ModelAdapterOptions,
    ): null | InstanceType<T>

    /**
     * Creating multiple model instances from an array of adapter
     * result
     */
    $createMultipleFromAdapterResult<T extends ModelConstructorContract> (
      this: T,
      results: ModelObject[],
      sideloadAttributes?: ModelObject,
      options?: ModelAdapterOptions,
    ): InstanceType<T>[]

    /**
     * Managing columns
     */
    $addColumn (name: string, options: Partial<ColumnNode>): void
    $hasColumn (name: string): boolean
    $getColumn (name: string): ColumnNode | undefined

    /**
     * Managing computed columns
     */
    $addComputed (name: string, options: Partial<ComputedNode>): void
    $hasComputed (name: string): boolean
    $getComputed (name: string): ComputedNode | undefined

    /**
     * Managing relationships
     */
    $addRelation (name: string, type: string, options: Partial<BaseRelationNode | ThroughRelationNode>): void
    $hasRelation (name: string): boolean
    $getRelation (name: string): RelationContract | undefined

    /**
     * Creating model
     */
    create<T extends ModelConstructorContract> (
      this: T,
      values: ModelObject,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Find one using the primary key
     */
    find<T extends ModelConstructorContract> (
      this: T,
      value: any,
      options?: ModelAdapterOptions,
    ): Promise<null | InstanceType<T>>

    /**
     * Find one using the primary key or fail
     */
    findOrFail<T extends ModelConstructorContract> (
      this: T,
      value: any,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Find many using an array of primary keys
     */
    findMany<T extends ModelConstructorContract> (
      this: T,
      value: any[],
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Returns the first row or save it to the database
     */
    firstOrSave<T extends ModelConstructorContract> (
      this: T,
      search: any,
      savePayload?: any,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Returns the first row or create a new instance of model without
     * persisting it
     */
    firstOrNew<T extends ModelConstructorContract> (
      this: T,
      search: any,
      savePayload?: any,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Returns the first row or save it to the database
     */
    updateOrCreate<T extends ModelConstructorContract> (
      this: T,
      search: any,
      updatePayload: any,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Fetch all rows
     */
    all<T extends ModelConstructorContract> (
      this: T,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Returns the query for fetching a model instance
     */
    query<
      Model extends ModelConstructorContract,
      Result extends any = InstanceType<Model>,
    > (
      this: Model,
      options?: ModelAdapterOptions,
    ): ModelQueryBuilderContract<Model, Result> & ExcutableQueryBuilderContract<Result[]>

    new (): ModelContract
  }

  /**
   * Every adapter must adhere to the Adapter contract
   */
  export interface AdapterContract {
    /**
     * Delete model instance
     */
    delete (instance: ModelContract): Promise<void>

    /**
     * Perform insert
     */
    insert (instance: ModelContract, attributes: any): Promise<void>

    /**
     * Perform update
     */
    update (instance: ModelContract, attributes: any): Promise<void>

    /**
     * Returns query client for a model instance by inspecting it's options
     */
    modelClient (instance: ModelContract): QueryClientContract

    /**
     * Must return the query builder for the model
     */
    query (
      modelConstructor: ModelConstructorContract,
      options?: ModelAdapterOptions,
    ): ModelQueryBuilderContract<ModelConstructorContract> & ExcutableQueryBuilderContract<ModelContract[]>
  }

  /**
   * Shape of the preloader to preload relationships
   */
  export interface PreloaderContract {
    parseRelationName (relationName: string): {
      primary: string,
      relation: RelationContract,
      children: { relationName: string } | null,
    }

    processForOne (name: string, model: ModelContract, client: QueryClientContract): Promise<void>
    processForMany (name: string, models: ModelContract[], client: QueryClientContract): Promise<void>
    processAllForOne (models: ModelContract, client: QueryClientContract): Promise<void>
    processAllForMany (models: ModelContract[], client: QueryClientContract): Promise<void>

    preload: QueryBuilderPreloadFn<this>
  }
}
