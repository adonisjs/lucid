/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Factory' {
  import { LucidRow, LucidModel } from '@ioc:Adonis/Lucid/Model'
  import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
  import { ExtractModelRelations, RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'

  /**
   * Function that create a new instance of a Lucid model with
   * the given attributes.
   */
  export type NewUpModelFunction<Model extends LucidModel, Attributes extends any> = (
    ctx: FactoryContextContract,
    attributes?: Attributes,
  ) => Promise<InstanceType<Model>> | InstanceType<Model>

  /**
   * Unwraps promise
   */
  export type UnwrapPromise<T> = T extends PromiseLike<infer U> ? U : T

  /**
   * Extracts the model for a factory by inspecting the ReturnType of
   * the `newUp` method
   */
  export type ExtractFactoryModel<
    T extends FactoryModelContract<LucidModel, any>
  > = UnwrapPromise<ReturnType<T['newUp']>>

  /**
   * Extracts the attributes accepted by the newUp method of a factory
   */
  export type ExtractFactoryAttributes<
    T extends FactoryModelContract<LucidModel, any>
  > = Parameters<T['newUp']>[1]

  /**
   * Callback to define a new model state
   */
  export type ModelStateCallback<Model extends LucidRow> = (
    model: Model,
    ctx: FactoryContextContract,
  ) => any | Promise<any>

  /**
   * The runtime context of the factory builder. A new state is constructed
   * for each `create/make` operation and passed down to relationships
   * as well.
   */
  export interface FactoryContextContract {
    faker: any,
    isStubbed: boolean,
    $trx: TransactionClientContract | undefined
  }

  /**
   * Shape of the factory relationships. To keep relationships slim, we will have
   * a common interface for relationships vs fine tuning API for each type of
   * relationship
   */
  export interface FactoryRelationContract {
    /**
     * Reference to the Lucid model relationship
     */
    relation: RelationshipsContract,

    /**
     * Pass context to the relationship. Must be done everytime, so that
     * relationships uses the same transaction as the parent model
     */
    withCtx (ctx: FactoryContextContract): this

    /**
     * Create and persist
     */
    create (
      parent: LucidRow,
      callback?: (factory: FactoryBuilderContract<FactoryModelContract<LucidModel, any>>) => void,
      count?: number,
    ): Promise<void>

    /**
     * Create and stub
     */
    make (
      parent: LucidRow,
      callback?: (factory: FactoryBuilderContract<FactoryModelContract<LucidModel, any>>) => void,
      count?: number,
    ): Promise<void>
  }

  /**
  * Factory builder uses the factory model to create/make
  * instances of lucid models
  */
  export interface FactoryBuilderContract<FactoryModel extends FactoryModelContract<LucidModel, any>> {
    /**
     * Apply pre-defined state
     */
    apply<K extends keyof FactoryModel['states']> (...states: K[]): this

    /**
     * Create/make relationships for explicitly defined related factories
     */
    with<K extends keyof FactoryModel['relations']> (
      relation: K,
      count?: number,
      callback?: (
        /**
         * Receives the explicitly defined factory
         */
        factory: FactoryModel['relations'][K] extends () => FactoryBuilderContract<any>
          ? ReturnType<FactoryModel['relations'][K]>
          : never
      ) => void,
    ): this

    /**
     * Define custom set of attributes. They are passed to the `newUp` method
     * of the factory.
     *
     * For `createMany` and `makeMany`, you can pass an array of attributes mapped
     * according to the array index.
     */
    fill (
      attributes: ExtractFactoryAttributes<FactoryModel> | ExtractFactoryAttributes<FactoryModel>[]
    ): this

    /**
     * Define custom runtime context. This method is usually called by
     * the relationships to ensure a single context is used by the
     * parent and relationship factories.
     *
     * Do not define a custom context, unless you know what you are really
     * doing.
     */
    withCtx (ctx: FactoryContextContract): this

    /**
     * Create model instance.
     */
    make (
      callback?: (
        model: ExtractFactoryModel<FactoryModel>,
        ctx: FactoryContextContract,
      ) => void
    ): Promise<ExtractFactoryModel<FactoryModel>>

    /**
     * Create and persist model instance
     */
    create (
      callback?: (
        model: ExtractFactoryModel<FactoryModel>,
        ctx: FactoryContextContract,
      ) => void
    ): Promise<ExtractFactoryModel<FactoryModel>>

    /**
     * Create more than one model instance
     */
    makeMany (
      count: number,
      callback?: (
        model: ExtractFactoryModel<FactoryModel>,
        ctx: FactoryContextContract,
      ) => void
    ): Promise<ExtractFactoryModel<FactoryModel>[]>

    /**
     * Create and persist more than one model instance
     */
    createMany (
      count: number,
      callback?: (
        model: ExtractFactoryModel<FactoryModel>,
        ctx: FactoryContextContract,
      ) => void
    ): Promise<ExtractFactoryModel<FactoryModel>[]>
  }

  /**
   * Factory model exposes the API to defined a model factory with states
   * and relationships
   */
  export interface FactoryModelContract<Model extends LucidModel, Attributes extends any> {
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
     * Returns the callback method for the state
     */
    getState (state: string): ModelStateCallback<InstanceType<Model>>

    /**
     * Returns the relationship and its factory.
     */
    getRelation (relation: string): FactoryRelationContract

    /**
     * Creates an instance of lucid model by invoking callback passed
     * to `Factory.define` method.
     */
    newUp: NewUpModelFunction<Model, Attributes>

    /**
     * Define custom state for the factory. When executing the factory,
     * you can apply the pre-defined states
     */
    state<K extends string> (
      state: K,
      callback: ModelStateCallback<InstanceType<Model>>,
    ): this & { states: { [P in K]: ModelStateCallback<InstanceType<Model>> } }

    /**
     * Define a relationship on another factory
     */
    related<K extends ExtractModelRelations<InstanceType<Model>>, Relation extends any> (
      relation: K,
      callback: Relation,
    ): this & { relations: { [P in K]: Relation } }

    /**
     * Build model factory. This method returns the factory builder, which can be used to
     * execute model queries
     */
    build (): FactoryBuilderContract<this>
  }

  /**
   * Factory manager to define new factories
   */
  export interface FactoryManager {
    /**
     * Define a custom factory
     */
    define<Model extends LucidModel, Attributes extends any> (
      model: Model,
      callback: NewUpModelFunction<Model, Attributes>
    ): FactoryModelContract<Model, Attributes>
  }

  const Factory: FactoryManager
  export default Factory
}
