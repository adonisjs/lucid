/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Model' {
  import { ChainableContract } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
  import { ProfilerContract, ProfilerRowContract } from '@ioc:Adonis/Core/Profiler'
  import { QueryClientContract, ExcutableQueryBuilderContract } from '@ioc:Adonis/Lucid/Database'

  /**
   * Represents a single column on the model
   */
  export type ColumnNode = {
    castAs: string,
    serializeAs: string,
    nullable: boolean,
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
    localKey: string,
    foreignKey: string,
    serializeAs: string,
  }

  /**
   * Shape of hasOneThrough relationship
   */
  export interface ThroughRelationNode extends BaseRelationNode {
    throughModel: (() => ModelConstructorContract)
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

  type DecoratorFn = (target, property) => void

  /**
   * Types for decorators
   */
  export type ColumnFn = (column?: Partial<ColumnNode>) => DecoratorFn
  export type ComputedFn = (column?: Partial<ComputedNode>) => DecoratorFn
  export type HasOneFn = (column?: Partial<BaseRelationNode>) => DecoratorFn
  export type HasManyFn = (column?: Partial<BaseRelationNode>) => DecoratorFn
  export type BelongsToFn = (column?: Partial<BaseRelationNode>) => DecoratorFn
  export type ManyToManyFn = (column?: Partial<BaseRelationNode>) => DecoratorFn
  export type HasOneThroughFn = (column?: Partial<ThroughRelationNode>) => DecoratorFn
  export type HasManyThroughFn = (column?: Partial<ThroughRelationNode>) => DecoratorFn

  export type AvailableRelations = 'hasOne'

  type ModelExecuteableQueryBuilder = ModelQueryBuilderContract<any> & ExcutableQueryBuilderContract<any>

  /**
   * Callback accepted by the preload method
   */
  export type PreloadCallback = (builder: ModelExecuteableQueryBuilder) => void

  /**
   * Interface to be implemented by all relationship types
   */
  export interface RelationContract {
    type: AvailableRelations
    serializeAs: string
    relatedModel (): ModelConstructorContract
    getQuery (model: ModelContract, options?: ModelOptions): ModelExecuteableQueryBuilder
    getEagerQuery (models: ModelContract[], options?: ModelOptions): ModelExecuteableQueryBuilder
    setRelated (model: ModelContract, related?: ModelContract | null): void
    setRelatedMany (models: ModelContract[], related: ModelContract[]): void
  }

  /**
   * Model query builder will have extras methods on top of Database query builder
   */
  export interface ModelQueryBuilderContract<
    Model extends ModelConstructorContract,
  > extends ChainableContract<Model['$refs']> {
    model: Model

    /**
     * A copy of options based to the query builder
     */
    options?: ModelOptions

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
    first (): Promise<InstanceType<Model> | null>

    /**
     * Return the first matching row or fail
     */
    firstOrFail (): Promise<InstanceType<Model>>

    /**
     * Define relationships to be preloaded
     */
    preload (relation: string, callback?: PreloadCallback): this
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
    $getRelated<K extends keyof this> (key: K, defaultValue?: any): this[K]
    $setRelated<K extends keyof this> (key: K, result: this[K]): void

    /**
     * Consume the adapter result and hydrate the model
     */
    $consumeAdapterResult (adapterResult: ModelObject, sideloadAttributes?: ModelObject): void

    fill (value: ModelObject): void
    merge (value: ModelObject): void

    save (): Promise<void>
    delete (): Promise<void>
    toJSON (): ModelObject
  }

  /**
   * Shape of the model static properties. The `$` prefix is to denote
   * special properties from the base model with exception to `create`
   * `findAll`, `findAll`.
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
     * Creating model from adapter results
     */
    $createFromAdapterResult<T extends ModelConstructorContract> (
      this: T,
      result?: ModelObject,
      sideloadAttributes?: ModelObject,
      options?: any,
    ): null | InstanceType<T>

    /**
     * Creating multiple model instances from an array of adapter
     * result
     */
    $createMultipleFromAdapterResult<T extends ModelConstructorContract> (
      this: T,
      results: ModelObject[],
      sideloadAttributes?: ModelObject,
      options?: any,
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
      options?: ModelOptions,
    ): InstanceType<T>

    /**
     * Find one using the primary key
     */
    find<T extends ModelConstructorContract> (
      this: T,
      value: any,
      options?: ModelOptions,
    ): Promise<null | InstanceType<T>>

    /**
     * Find one using the primary key or fail
     */
    findOrFail<T extends ModelConstructorContract> (
      this: T,
      value: any,
      options?: ModelOptions,
    ): Promise<InstanceType<T>>

    /**
     * Find many using an array of primary keys
     */
    findMany<T extends ModelConstructorContract> (
      this: T,
      value: any[],
      options?: ModelOptions,
    ): Promise<InstanceType<T>[]>

    /**
     * Returns the first row or save it to the database
     */
    firstOrSave<T extends ModelConstructorContract> (
      this: T,
      search: any,
      savePayload?: any,
      options?: ModelOptions,
    ): Promise<InstanceType<T>>

    /**
     * Returns the first row or create a new instance of model without
     * persisting it
     */
    firstOrNew<T extends ModelConstructorContract> (
      this: T,
      search: any,
      savePayload?: any,
      options?: ModelOptions,
    ): Promise<InstanceType<T>>

    /**
     * Fetch all rows
     */
    all<T extends ModelConstructorContract> (this: T, options?: ModelOptions): Promise<InstanceType<T>[]>

    /**
     * Returns the query for fetching a model instance
     */
    query<
      Model extends ModelConstructorContract,
    > (
      this: Model,
      options?: ModelOptions,
    ): ModelQueryBuilderContract<Model> & ExcutableQueryBuilderContract<InstanceType<Model>[]>

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
     * Must return the query builder for the model
     */
    query (
      modelConstructor: ModelConstructorContract,
      options?: ModelOptions,
    ): ModelQueryBuilderContract<ModelConstructorContract> & ExcutableQueryBuilderContract<ModelContract[]>
  }
}
