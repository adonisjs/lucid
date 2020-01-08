/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Model' {
  import knex from 'knex'
  import { ProfilerContract, ProfilerRowContract } from '@ioc:Adonis/Core/Profiler'
  import {
    Update,
    Counter,
    StrictValues,
    QueryCallback,
    ChainableContract,
    ExcutableQueryBuilderContract,
  } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

  import {
    QueryClientContract,
    TransactionClientContract,
  } from '@ioc:Adonis/Lucid/Database'

  import {
    TypedRelations,
    RelationOptions,
    ExtractRelations,
    PreloaderContract,
    ExtractRelationModel,
    QueryBuilderPreloadFn,
    RelationshipsContract,
    ThroughRelationOptions,
    ManyToManyRelationOptions,
  } from '@ioc:Adonis/Lucid/Relations'

  /**
   * ------------------------------------------------------
   *  Helpers
   * ------------------------------------------------------
   */

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
  export type EventsList = 'save' | 'create' | 'update' | 'delete'
  export type HooksHandler<T> = ((model: T) => Promise<void> | void) | string

  /**
   * Extract columns from a model class
   */
  export type AsColumns<K extends any> = {
    [P in keyof K]: string
  }

  /**
   * ------------------------------------------------------
   * Decorators and Options
   * ------------------------------------------------------
   */

  /**
   * Options for defining a column
   */
  export type ColumnOptions = {
    castAs: string,
    serializeAs: string | null,
    isPrimary: boolean,
    hasGetter: boolean,
    hasSetter: boolean,
    serialize?: (value: any, attribute: string, model: ModelContract) => any,
  }

  /**
   * Represents a computed property on the model
   */
  export type ComputedOptions = {
    serializeAs: string | null,
  }

  /**
   * Signature for decorator functions
   */
  export type ColumnDecorator = (
    options?: Partial<Omit<ColumnOptions, 'hasGetter' | 'hasSetter'>>,
  ) => (target, property) => void
  export type ComputedDecorator = (options?: Partial<ComputedOptions>) => (target, property) => void

  /**
   * ------------------------------------------------------
   * Model Options
   * ------------------------------------------------------
   */

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
   * Preload function on a model instance
   */
  interface ModelBuilderPreloadFn<
    Model extends ModelContract,
  > extends QueryBuilderPreloadFn<Model, Promise<void>> {
    (callback: (preloader: PreloaderContract<Model>) => void): Promise<void>
  }

  /**
   * ------------------------------------------------------
   * Model Query Builder
   * ------------------------------------------------------
   */

  /**
   * Model query builder will have extras methods on top of Database query builder
   */
  export interface ModelQueryBuilderContract<
    Model extends ModelConstructorContract,
    Result extends any = InstanceType<Model>
  >
    extends ChainableContract, ExcutableQueryBuilderContract<Result[]>
  {
    model: Model

    /**
     * A copy of client options. They can be set on any model instance
     */
    readonly clientOptions: ModelAdapterOptions

    /**
     * Reference to query client used for making queries
     */
    client: QueryClientContract
    knexQuery: knex.QueryBuilder,

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
    update: Update<ModelQueryBuilderContract<Model, number>>
    increment: Counter<ModelQueryBuilderContract<Model, number>>
    decrement: Counter<ModelQueryBuilderContract<Model, number>>
    del (): ModelQueryBuilderContract<Model, number>

    /**
     * Define relationships to be preloaded
     */
    preload: QueryBuilderPreloadFn<InstanceType<Model>, this>
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
   */
  export interface ModelContract {
    $attributes: ModelObject
    $extras: ModelObject
    $original: ModelObject
    $dirty: ModelObject
    $isPersisted: boolean
    $isNew: boolean
    $isLocal: boolean
    $isDirty: boolean
    $isDeleted: boolean
    $preloaded: { [relation: string]: ModelContract | ModelContract[] }
    $sideloaded: ModelObject
    $primaryKeyValue?: number | string
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
    $getQueryFor (
      action: 'insert' | 'delete' | 'update',
      client: QueryClientContract,
    ): ReturnType<QueryClientContract['query']> | ReturnType<QueryClientContract['insertQuery']>

    /**
     * Read/write attributes
     */
    $setAttribute (key: string, value: any): void
    $getAttribute (key: string): any
    $getAttributeFromCache (key: string, callback: CacheNode['getter']): any

    /**
     * Read/write realtionships
     */
    $hasRelated<Name extends keyof this = keyof this> (key: Name): boolean

    $setRelated<
      Name extends keyof ExtractRelations<this>,
      RelationType extends TypedRelations = this[Name] extends TypedRelations ? this[Name] : never
    > (
      key: Name,
      result: ExtractRelationModel<RelationType>
    ): void

    $pushRelated<
      Name extends keyof ExtractRelations<this>,
      RelationType extends TypedRelations = this[Name] extends TypedRelations ? this[Name] : never,
      RelationModel extends ExtractRelationModel<RelationType> = ExtractRelationModel<RelationType>
    > (
      key: Name,
      result: RelationModel extends any[] ? RelationModel | RelationModel[0] : RelationModel
    ): void

    $getRelated<
      Name extends keyof ExtractRelations<this>,
      RelationType extends TypedRelations = this[Name] extends TypedRelations ? this[Name] : never,
      RelationModel extends ExtractRelationModel<RelationType> = ExtractRelationModel<RelationType>
    > (
      key: Name,
      defaultValue?: any,
    ): RelationModel extends any[] ? RelationModel : (RelationModel | undefined)

    /**
     * Consume the adapter result and hydrate the model
     */
    $consumeAdapterResult (adapterResult: ModelObject, sideloadAttributes?: ModelObject): void

    fill (value: ModelObject): void
    merge (value: ModelObject): void
    save (): Promise<void>
    delete (): Promise<void>
    serialize (): ModelObject
    toJSON (): ModelObject
    refresh (): Promise<void>

    preload: ModelBuilderPreloadFn<this>

    related<
      Name extends keyof ExtractRelations<this>,
      RelationType extends TypedRelations = this[Name] extends TypedRelations ? this[Name] : never
    > (
      relation: Name,
    ): ReturnType<RelationType['relation']['client']>
  }

  /**
   * ------------------------------------------------------
   * Shape of Model constructor
   * ------------------------------------------------------
   */

  /**
   * Shape of the model static properties. The `$` prefix is to denote
   * special properties from the base model
   */
  export interface ModelConstructorContract<Model extends ModelContract = ModelContract> {
    /**
     * Whether or not model has been booted. After this model configurations
     * are ignored
     */
    $booted: boolean

    /**
     * A map of defined columns
     */
    $columns: Map<string, ColumnOptions>

    /**
     * A map of defined relationships
     */
    $relations: Map<string, RelationshipsContract>

    /**
     * A map of computed properties
     */
    $computed: Map<string, ComputedOptions>

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
     * Used to construct defaults for the model
     */
    $configurator: OrmConfigContract,

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
    $refs: { [key: string]: string }

    $boot (): void

    /**
     * Register a before hook
     */
    $before<T extends ModelConstructorContract> (
      this: T,
      event: EventsList,
      handler: HooksHandler<InstanceType<T>>,
    ): void

    /**
     * Register an after hook
     */
    $after<T extends ModelConstructorContract> (
      this: T,
      event: EventsList,
      handler: HooksHandler<InstanceType<T>>,
    ): void

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
    $addColumn (name: string, options: Partial<ColumnOptions>): void
    $hasColumn (name: string): boolean
    $getColumn (name: string): ColumnOptions | undefined

    /**
     * Managing computed columns
     */
    $addComputed (name: string, options: Partial<ComputedOptions>): void
    $hasComputed (name: string): boolean
    $getComputed (name: string): ComputedOptions | undefined

    /**
     * Managing relationships
     */
    $addRelation (
      name: string,
      type: string,
      options: Partial<RelationOptions | ManyToManyRelationOptions | ThroughRelationOptions>,
    ): void

    /**
     * Find if a relationship exists
     */
    $hasRelation (name: string): boolean

    /**
     * Get relationship declaration
     */
    $getRelation<
      T extends ModelConstructorContract,
      M extends InstanceType<T>,
      Name extends keyof ExtractRelations<M>,
      RelationType extends TypedRelations = M[Name] extends TypedRelations ? M[Name] : never
    > (this: T, name: Name): RelationType['relation']

    /**
     * Resolve keys to their database column names
     */
    $resolveCastKey (key: string): string
    $mapKeysToCastKeys (values: ModelObject): ModelObject

    /**
     * Creating model
     */
    create<T extends ModelConstructorContract> (
      this: T,
      values: ModelObject,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Creating many of model instance
     */
    createMany<T extends ModelConstructorContract> (
      this: T,
      values: ModelObject[],
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

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
    firstOrCreate<T extends ModelConstructorContract> (
      this: T,
      search: any,
      savePayload?: any,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Find rows or create in-memory instances of the missing
     * one's.
     */
    fetchOrNewUpMany<T extends ModelConstructorContract> (
      this: T,
      uniqueKey: string,
      payload: ModelObject[],
      options?: ModelAdapterOptions,
      mergeAttributes?: boolean,
    ): Promise<InstanceType<T>[]>

    /**
     * Find rows or create many when missing. One db call is invoked
     * for each create
     */
    fetchOrCreateMany<T extends ModelConstructorContract> (
      this: T,
      uniqueKey: string,
      payload: ModelObject[],
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

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
     * Update existing rows or create new one's.
     */
    updateOrCreateMany<T extends ModelConstructorContract> (
      this: T,
      uniqueKey: string,
      payload: ModelObject[],
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

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
    > (this: Model, options?: ModelAdapterOptions): ModelQueryBuilderContract<Model, Result>

    new (): Model
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
    modelClient (instance: ModelContract): QueryClientContract

    modelConstructorClient (
      modelConstructor: ModelConstructorContract,
      options?: ModelAdapterOptions,
    ): QueryClientContract

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
     * Must return the query builder for the model
     */
    query (
      modelConstructor: ModelConstructorContract,
      options?: ModelAdapterOptions,
    ): ModelQueryBuilderContract<ModelConstructorContract, ModelContract>
  }

  /**
   * Shape of ORM config to have a standard place for computing
   * defaults
   */
  export type OrmConfigContract = {
    getTableName (model: ModelConstructorContract): string
    getCastAsKey (model: ModelConstructorContract, key: string): string
    getSerializeAsKey (model: ModelConstructorContract, key: string): string
    serialize (model: ModelConstructorContract, key: string): boolean

    getLocalKey (
      relation: TypedRelations['type'],
      model: ModelConstructorContract,
      relatedModel: ModelConstructorContract,
    ): string

    getForeignKey (
      relation: TypedRelations['type'],
      model: ModelConstructorContract,
      relatedModel: ModelConstructorContract,
    ): string

    getPivotTableName (
      relation: TypedRelations['type'],
      model: ModelConstructorContract,
      relatedModel: ModelConstructorContract,
      relationName: string,
    ): string

    getPivotForeignKey (
      relation: TypedRelations['type'],
      model: ModelConstructorContract,
      relatedModel: ModelConstructorContract,
      relationName: string,
    ): string
  }
}
