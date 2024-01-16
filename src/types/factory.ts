/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker'
import { OneOrMany } from './querybuilder.js'
import { RelationshipsContract, ExtractModelRelations } from './relations.js'
import { QueryClientContract, TransactionClientContract } from './database.js'
import { LucidRow, LucidModel, ModelAttributes, ModelAdapterOptions, ModelObject } from './model.js'

/**
 * ------------------------------------------------------
 *  Helpers
 * ------------------------------------------------------
 */

/**
 * Extracts the attributes accepted by the lucid model set on a
 * factory
 */
export type ExtractFactoryAttributes<Model extends LucidModel> = Partial<
  ModelAttributes<InstanceType<Model>>
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
export type NewUpCallback<Model extends LucidModel, T extends FactoryModelContract<Model>> = (
  attributes: ExtractFactoryAttributes<Model>,
  ctx: FactoryContextContract,
  model: Model,
  builder: FactoryBuilderContract<Model, T>
) => InstanceType<Model>

/**
 * Function to merge attributes defined during runtime
 */
export type MergeCallback<Model extends LucidModel, T extends FactoryModelContract<Model>> = (
  row: InstanceType<Model>,
  attributes: ExtractFactoryAttributes<Model>,
  ctx: FactoryContextContract,
  builder: FactoryBuilderContract<Model, T>
) => void

/**
 * Callback to define a new model state
 */
export type StateCallback<Model extends LucidModel> = (
  row: InstanceType<Model>,
  ctx: FactoryContextContract,
  builder: FactoryBuilderContract<Model, FactoryModelContract<Model>>
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
export type HooksHandler<Model extends LucidModel, T extends FactoryModelContract<Model>> = (
  builder: FactoryBuilderContract<Model, T>,
  row: InstanceType<Model>,
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
  builder: FactoryBuilderContract<LucidModel, FactoryModelContract<LucidModel>>
) => void

/**
 * Shape of the factory relationships. To keep relationships slim, we will have
 * a common interface for relationships vs fine tuning API for each type of
 * relationship
 */
export interface FactoryRelationContract {
  parent: LucidRow

  /**
   * Reference to the Lucid model relationship
   */
  relation: RelationshipsContract

  /**
   * Merge attributes with the relationship and its children
   */
  merge(attributes: any): this

  /**
   * Define custom pivot attributes for many to many
   * relationship
   */
  pivotAttributes?(attributes: ModelObject | ModelObject[]): this

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
export interface FactoryBuilderContract<
  Model extends LucidModel,
  FactoryModel extends FactoryModelContract<Model>,
> {
  /**
   * Reference to the factory
   */
  factory: FactoryModel

  /**
   * Define custom database connection
   */
  connection(connection: string): FactoryBuilderContract<Model, FactoryModel>

  /**
   * Define custom query client
   */
  client(client: QueryClientContract): FactoryBuilderContract<Model, FactoryModel>

  /**
   * Apply pre-defined state
   */
  apply<K extends keyof FactoryModel['states']>(
    ...states: K[]
  ): FactoryBuilderContract<Model, FactoryModel>

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
      builder: FactoryModel['relations'][K] extends () => FactoryBuilderContract<any, any>
        ? ReturnType<FactoryModel['relations'][K]> & {
            parent: InstanceType<FactoryModel['model']>
          }
        : never
    ) => void
  ): FactoryBuilderContract<Model, FactoryModel>

  /**
   * Define pivot attributes when persisting a many to many
   * relationship. Results in a noop, when not called
   * for a many to many relationship
   */
  pivotAttributes(
    attributes: ModelObject | ModelObject[]
  ): FactoryBuilderContract<Model, FactoryModel>

  /**
   * Merge custom set of attributes. They are passed to the merge method of
   * the model factory
   *
   * For `createMany` and `makeMany`, you can pass an array of attributes mapped
   * according to the array index.
   */
  merge(
    attributes: OneOrMany<ExtractFactoryAttributes<Model>>
  ): FactoryBuilderContract<Model, FactoryModel>

  /**
   * Merge custom set of attributes with the correct factory builder
   * model and all of its relationships as well
   */
  mergeRecursive(attributes: any): FactoryBuilderContract<Model, FactoryModel>

  /**
   * Define custom runtime context. This method is usually called by
   * the relationships to ensure a single context is used by the
   * parent and relationship factories.
   *
   * Do not define a custom context, unless you know what you are really
   * doing.
   */
  useCtx(ctx: FactoryContextContract): FactoryBuilderContract<Model, FactoryModel>

  /**
   * Tap into the persistence layer of factory builder. Allows one
   * to modify the model instance just before it is persisted
   * to the database
   */
  tap(
    callback: (
      row: InstanceType<FactoryModel['model']>,
      ctx: FactoryContextContract,
      builder: FactoryBuilderContract<Model, FactoryModel>
    ) => void
  ): FactoryBuilderContract<Model, FactoryModel>

  /**
   * Make model instance without persitance. The make method
   * doesn't process relationships
   */
  make(): Promise<InstanceType<FactoryModel['model']>>

  /**
   * Create model instance and stub out the persistance
   * mechanism
   */
  makeStubbed(): Promise<InstanceType<FactoryModel['model']>>

  /**
   * Create and persist model instance
   */
  create(): Promise<InstanceType<FactoryModel['model']>>

  /**
   * Make model instance without persitance. The makeMany method
   * doesn't process relationships
   */
  makeMany(count: number): Promise<InstanceType<FactoryModel['model']>[]>

  /**
   * Create one or more model instances and stub
   * out the persistance mechanism.
   */
  makeStubbedMany(count: number): Promise<InstanceType<FactoryModel['model']>[]>

  /**
   * Create and persist more than one model instance
   */
  createMany(count: number): Promise<InstanceType<FactoryModel['model']>[]>
}

/**
 * Query contract that initiates the factory builder. Since the factory builder
 * API surface is small, we also proxy all of it's methods for a nicer DX
 */
export interface FactoryBuilderQueryContract<
  Model extends LucidModel,
  FactoryModel extends FactoryModelContract<Model>,
> extends FactoryBuilderContract<Model, FactoryModel> {
  query(
    options?: ModelAdapterOptions,
    viaRelation?: FactoryRelationContract
  ): FactoryBuilderContract<Model, FactoryModel>
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
   * instance and manage merging attributes
   */
  newUp(callback: NewUpCallback<Model, this>): this
  merge(callback: MergeCallback<Model, this>): this

  /**
   * Define custom state for the factory. When executing the factory,
   * you can apply the pre-defined states
   */
  state<K extends string>(
    state: K,
    callback: StateCallback<Model>
  ): this & { states: { [P in K]: StateCallback<Model> } }

  /**
   * Returns state callback
   */
  getState(state: keyof this['states']): StateCallback<Model>

  /**
   * Define a relationship on another factory
   */
  relation<K extends ExtractModelRelations<InstanceType<Model>>, Relation>(
    relation: K,
    callback: Relation
  ): this & { relations: { [P in K]: Relation } }

  /**
   * Returns registered relationship for a factory
   */
  getRelation(relation: keyof this['relations']): FactoryRelationContract

  /**
   * Define before hooks. Only `create` event is invoked
   * during the before lifecycle
   */
  before(event: Exclude<EventsList, 'make'>, handler: HooksHandler<Model, this>): this

  /**
   * Define after hooks.
   */
  after(event: EventsList, handler: HooksHandler<Model, this>): this

  /**
   * Build model factory. This method returns the factory builder, which can be used to
   * execute model queries
   */
  build(): FactoryBuilderQueryContract<Model, this>
}
