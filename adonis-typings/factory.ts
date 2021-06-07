/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Lucid/Factory' {
  import faker from 'faker'
  import {
    OneOrMany,
    QueryClientContract,
    TransactionClientContract,
  } from '@ioc:Adonis/Lucid/Database'
  import {
    LucidRow,
    LucidModel,
    ModelAttributes,
    ModelAdapterOptions,
    RelationshipsContract,
    ExtractModelRelations,
  } from '@ioc:Adonis/Lucid/Orm'

  /**
   * ------------------------------------------------------
   *  Helpers
   * ------------------------------------------------------
   */

  /**
   * Extracts the attributes accepted by the lucid model set on a
   * factory
   */
  export type ExtractFactoryAttributes<T extends FactoryModelContract<LucidModel>> = Partial<
    ModelAttributes<InstanceType<T['model']>>
  >

  /**
   * ------------------------------------------------------
   *  Callbacks
   * ------------------------------------------------------
   */

  /**
   * Function to return the model attributes.
   */
  export type DefineCallback<Model extends LucidModel> = (
    ctx: FactoryContextContract
  ) =>
    | Promise<Partial<ModelAttributes<InstanceType<Model>>>>
    | Partial<ModelAttributes<InstanceType<Model>>>

  /**
   * Function to generate custom stub ids
   */
  export type StubIdCallback = (counter: number, model: LucidRow) => any

  /**
   * Function to initiate a model instance. It will receive the
   * attributes returned by the `define` method
   */
  export type NewUpCallback<T extends FactoryModelContract<LucidModel>> = (
    attributes: ExtractFactoryAttributes<T>,
    ctx: FactoryContextContract
  ) => InstanceType<T['model']>

  /**
   * Function to merge attributes defined during runtime
   */
  export type MergeCallback<T extends FactoryModelContract<LucidModel>> = (
    model: InstanceType<T['model']>,
    attributes: ExtractFactoryAttributes<T>,
    ctx: FactoryContextContract
  ) => void

  /**
   * Callback to define a new model state
   */
  export type StateCallback<Model extends LucidRow> = (
    model: Model,
    ctx: FactoryContextContract
  ) => any | Promise<any>

  /**
   * ------------------------------------------------------
   *  Hooks
   * ------------------------------------------------------
   */

  /**
   * List of events for which a factory will trigger hooks
   */
  export type EventsList = 'makeStubbed' | 'create' | 'make'

  /**
   * Shape of hooks handler
   */
  export type HooksHandler<Model extends FactoryModelContract<LucidModel>> = (
    factory: FactoryBuilderContract<Model>,
    model: InstanceType<Model['model']>,
    ctx: FactoryContextContract
  ) => void | Promise<void>

  /**
   * ------------------------------------------------------
   *  Runtime context
   * ------------------------------------------------------
   */

  /**
   * The runtime context of the factory builder. A new state is constructed
   * for each `create/make` operation and passed down to relationships
   * as well.
   */
  export interface FactoryContextContract {
    faker: typeof faker
    isStubbed: boolean
    $trx: TransactionClientContract | undefined
  }

  /**
   * ------------------------------------------------------
   *  Relationships
   * ------------------------------------------------------
   */

  /**
   * Callback accepted by the `with` method and relationships
   * `create` and `make` methods
   */
  export type RelationCallback = (
    factory: FactoryBuilderContract<FactoryModelContract<LucidModel>>
  ) => void

  /**
   * Shape of the factory relationships. To keep relationships slim, we will have
   * a common interface for relationships vs fine tuning API for each type of
   * relationship
   */
  export interface FactoryRelationContract {
    /**
     * Reference to the Lucid model relationship
     */
    relation: RelationshipsContract

    /**
     * Pass context to the relationship. Must be done everytime, so that
     * relationships uses the same transaction as the parent model
     */
    useCtx(ctx: FactoryContextContract): this

    /**
     * Create and persist
     */
    create(parent: LucidRow, callback?: RelationCallback, count?: number): Promise<void>

    /**
     * Create and stub
     */
    make(parent: LucidRow, callback?: RelationCallback, count?: number): Promise<void>
  }

  /**
   * ------------------------------------------------------
   *  Runtime builder
   * ------------------------------------------------------
   */

  /**
   * Factory builder uses the factory model to create/make
   * instances of lucid models
   */
  export interface FactoryBuilderContract<FactoryModel extends FactoryModelContract<LucidModel>> {
    /**
     * Define custom database connection
     */
    connection(connection: string): this

    /**
     * Define custom query client
     */
    client(client: QueryClientContract): this

    /**
     * Apply pre-defined state
     */
    apply<K extends keyof FactoryModel['states']>(...states: K[]): this

    /**
     * Create/make relationships for explicitly defined related factories
     */
    with<K extends keyof FactoryModel['relations']>(
      relation: K,
      count?: number,
      callback?: (
        /**
         * Receives the explicitly defined factory
         */
        factory: FactoryModel['relations'][K] extends () => FactoryBuilderContract<any>
          ? ReturnType<FactoryModel['relations'][K]>
          : never
      ) => void
    ): this

    /**
     * Merge custom set of attributes. They are passed to the merge method of
     * the model factory
     *
     * For `createMany` and `makeMany`, you can pass an array of attributes mapped
     * according to the array index.
     */
    merge(attributes: OneOrMany<ExtractFactoryAttributes<FactoryModel>>): this

    /**
     * Define custom runtime context. This method is usually called by
     * the relationships to ensure a single context is used by the
     * parent and relationship factories.
     *
     * Do not define a custom context, unless you know what you are really
     * doing.
     */
    useCtx(ctx: FactoryContextContract): this

    /**
     * Make model instance without persitance. The make method
     * doesn't process relationships
     */
    make(
      callback?: (model: InstanceType<FactoryModel['model']>, ctx: FactoryContextContract) => void
    ): Promise<InstanceType<FactoryModel['model']>>

    /**
     * Create model instance and stub out the persistance
     * mechanism
     */
    makeStubbed(
      callback?: (model: InstanceType<FactoryModel['model']>, ctx: FactoryContextContract) => void
    ): Promise<InstanceType<FactoryModel['model']>>

    /**
     * Create and persist model instance
     */
    create(
      callback?: (model: InstanceType<FactoryModel['model']>, ctx: FactoryContextContract) => void
    ): Promise<InstanceType<FactoryModel['model']>>

    /**
     * Make model instance without persitance. The makeMany method
     * doesn't process relationships
     */
    makeMany(
      count: number,
      callback?: (model: InstanceType<FactoryModel['model']>, ctx: FactoryContextContract) => void
    ): Promise<InstanceType<FactoryModel['model']>[]>

    /**
     * Create one or more model instances and stub
     * out the persistance mechanism.
     */
    makeStubbedMany(
      count: number,
      callback?: (model: InstanceType<FactoryModel['model']>, ctx: FactoryContextContract) => void
    ): Promise<InstanceType<FactoryModel['model']>[]>

    /**
     * Create and persist more than one model instance
     */
    createMany(
      count: number,
      callback?: (model: InstanceType<FactoryModel['model']>, ctx: FactoryContextContract) => void
    ): Promise<InstanceType<FactoryModel['model']>[]>
  }

  /**
   * Query contract that initiates the factory builder. Since the factory builder
   * API surface is small, we also proxy all of it's methods for a nicer DX
   */
  export interface FactoryBuilderQueryContract<
    FactoryModel extends FactoryModelContract<LucidModel>
  > extends FactoryBuilderContract<FactoryModel> {
    query(options?: ModelAdapterOptions): FactoryBuilderContract<FactoryModel>
  }

  /**
   * ------------------------------------------------------
   *  Factory model
   * ------------------------------------------------------
   */

  /**
   * Factory model exposes the API to defined a model factory with states
   * and relationships
   */
  export interface FactoryModelContract<Model extends LucidModel> {
    /**
     * Reference to the underlying lucid model used by the factory
     * model
     */
    model: Model

    /**
     * Mainly for types support. Not used at runtime to derive any
     * logic. Sorry, at times have to hack into typescript to
     * get the desired output. :)
     */
    states: unknown
    relations: unknown

    /**
     * Optionally define a custom method to instantiate the model
     * instance
     */
    newUp(callback: NewUpCallback<this>): this
    merge(callback: MergeCallback<this>): this

    /**
     * Define custom state for the factory. When executing the factory,
     * you can apply the pre-defined states
     */
    state<K extends string>(
      state: K,
      callback: StateCallback<InstanceType<Model>>
    ): this & { states: { [P in K]: StateCallback<InstanceType<Model>> } }

    /**
     * Define a relationship on another factory
     */
    relation<K extends ExtractModelRelations<InstanceType<Model>>, Relation>(
      relation: K,
      callback: Relation
    ): this & { relations: { [P in K]: Relation } }

    /**
     * Define before hooks. Only `create` event is invoked
     * during the before lifecycle
     */
    before(event: Exclude<EventsList, 'make'>, handler: HooksHandler<this>): this

    /**
     * Define after hooks.
     */
    after(event: EventsList, handler: HooksHandler<this>): this

    /**
     * Build model factory. This method returns the factory builder, which can be used to
     * execute model queries
     */
    build(): FactoryBuilderQueryContract<this>
  }

  /**
   * ------------------------------------------------------
   *  Manager to register new factories
   * ------------------------------------------------------
   */

  /**
   * Factory manager to define new factories
   */
  export interface FactoryManagerContract {
    /**
     * Define a custom factory
     */
    define<Model extends LucidModel>(
      model: Model,
      callback: DefineCallback<Model>
    ): FactoryModelContract<Model>

    /**
     * Define a custom callback to generate stub ids
     */
    stubId(callback: StubIdCallback): void
  }

  const Factory: FactoryManagerContract
  export default Factory
}
