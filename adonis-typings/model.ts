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
    Aggregate,
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
    columnName: string,
    serializeAs: string | null, // null means do not serialize column
    isPrimary: boolean,
    hasGetter: boolean,
    hasSetter: boolean,
    meta?: any,
    serialize?: (value: any, attribute: string, model: ModelContract) => any,
    prepare?: (value: any, attribute: string, model: ModelContract) => any,
    consume?: (value: any, attribute: string, model: ModelContract) => any,
  }

  /**
   * Represents a computed property on the model
   */
  export type ComputedOptions = {
    serializeAs: string | null,
    meta?: any,
  }

  /**
   * Signature for decorator functions
   */
  export type ColumnDecorator = (
    options?: Partial<Omit<ColumnOptions, 'hasGetter' | 'hasSetter'>>,
  ) => (target: any, property: any) => void

  export type ComputedDecorator = (
    options?: Partial<ComputedOptions>,
  ) => (target: any, property: any) => void

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
    knexQuery: knex.QueryBuilder

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
   */
  export interface ModelContract {
    $attributes: ModelObject
    extras: ModelObject
    $original: ModelObject
    $preloaded: { [relation: string]: ModelContract | ModelContract[] }

    /**
     * Columns is a property to get type information for model
     * attributes. This must be declared by the end user
     */
    $columns: any

    sideloaded: ModelObject
    primaryKeyValue?: number | string
    isPersisted: boolean
    isNew: boolean
    isLocal: boolean
    dirty: ModelObject
    isDirty: boolean
    isDeleted: boolean

    options?: ModelOptions
    trx?: TransactionClientContract,
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

    hydrateOriginals(): void
    fill (value: ModelObject): void
    merge (value: ModelObject): void
    save (): Promise<void>
    delete (): Promise<void>

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
    ): { [key: string]: ModelContract | ModelContract[] }

    /**
     * Serialize relationships to key-value pair of plain nested objects
     */
    serializeRelations (
      fieldsToCherryPick: ModelObject | undefined,
      raw: false | undefined,
    ): ModelObject

    /**
     * Serialize relationships to key-value pair of plain nested objects
     * or a key-value pair of model instances.
     */
    serializeRelations (
      fieldsToCherryPick?: ModelObject,
      raw?: boolean,
    ): ModelObject | { [key: string]: ModelContract | ModelContract[] }

    /**
     * Serialize model to a plain object
     */
    serialize (fieldsToCherryPick?: ModelObject): ModelObject
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
    readonly booted: boolean

    /**
     * A map of defined columns
     */
    $columnsDefinitions: Map<string, ColumnOptions>

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
     * Adapter to work as a bridge between query builder and the model
     */
    $adapter: AdapterContract

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
     * Whether primary key is auto incrementing or not. If not, then
     * end user must provide the value for the primary key
     */
    increments: boolean

    /**
     * Database table to use
     */
    table: string

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
    $addColumn (name: string, options: Partial<ColumnOptions>): ColumnOptions
    $hasColumn (name: string): boolean
    $getColumn (name: string): ColumnOptions | undefined

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
     * Boot model
     */
    boot (): void

    /**
     * Register a before hook
     */
    before<T extends ModelConstructorContract> (
      this: T,
      event: EventsList,
      handler: HooksHandler<InstanceType<T>>,
    ): void

    /**
     * Register an after hook
     */
    after<T extends ModelConstructorContract> (
      this: T,
      event: EventsList,
      handler: HooksHandler<InstanceType<T>>,
    ): void

    /**
     * Creating model
     */
    create<T extends ModelConstructorContract> (
      this: T,
      values: Partial<InstanceType<T>['$columns']>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Creating many of model instance
     */
    createMany<T extends ModelConstructorContract> (
      this: T,
      values: Partial<InstanceType<T>['$columns']>[],
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
      search: Partial<Model['$columns']>,
      savePayload?: Partial<Model['$columns']>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Returns the first row or save it to the database
     */
    firstOrCreate<T extends ModelConstructorContract> (
      this: T,
      search: Partial<InstanceType<T>['$columns']>,
      savePayload?: Partial<InstanceType<T>['$columns']>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Find rows or create in-memory instances of the missing
     * one's.
     */
    fetchOrNewUpMany<T extends ModelConstructorContract> (
      this: T,
      uniqueKey: keyof InstanceType<T>['$columns'],
      payload: Partial<InstanceType<T>['$columns']>[],
      options?: ModelAdapterOptions,
      mergeAttributes?: boolean,
    ): Promise<InstanceType<T>[]>

    /**
     * Find rows or create many when missing. One db call is invoked
     * for each create
     */
    fetchOrCreateMany<T extends ModelConstructorContract> (
      this: T,
      uniqueKey: keyof InstanceType<T>['$columns'],
      payload: Partial<InstanceType<T>['$columns']>[],
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Returns the first row or save it to the database
     */
    updateOrCreate<T extends ModelConstructorContract> (
      this: T,
      search: Partial<InstanceType<T>['$columns']>,
      updatePayload: Partial<InstanceType<T>['$columns']>,
      options?: ModelAdapterOptions,
    ): Promise<InstanceType<T>>

    /**
     * Update existing rows or create new one's.
     */
    updateOrCreateMany<T extends ModelConstructorContract> (
      this: T,
      uniqueKey: keyof InstanceType<T>['$columns'],
      payload: Partial<InstanceType<T>['$columns']>[],
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
    /**
     * Return the default table name for a given model
     */
    getTableName (model: ModelConstructorContract): string

    /**
     * Return the `columnName` for a given model
     */
    getColumnName (model: ModelConstructorContract, key: string): string

    /**
     * Return the `serializeAs` key for a given model property
     */
    getSerializeAsKey (model: ModelConstructorContract, key: string): string

    /**
     * Return the local key property name for a given relationship
     */
    getLocalKey (
      relation: TypedRelations['type'],
      model: ModelConstructorContract,
      relatedModel: ModelConstructorContract,
    ): string

    /**
     * Return the foreign key property name for a given relationship
     */
    getForeignKey (
      relation: TypedRelations['type'],
      model: ModelConstructorContract,
      relatedModel: ModelConstructorContract,
    ): string

    /**
     * Return the pivot table name for many to many relationship
     */
    getPivotTableName (
      relation: 'manyToMany',
      model: ModelConstructorContract,
      relatedModel: ModelConstructorContract,
      relationName: string,
    ): string

    /**
     * Return the pivot foreign key for many to many relationship
     */
    getPivotForeignKey (
      relation: 'manyToMany',
      model: ModelConstructorContract,
      relatedModel: ModelConstructorContract,
      relationName: string,
    ): string
  }
}
