/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Factory' {
  import { OneOrMany } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
  import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
  import { LucidRow, LucidModel, ModelAttributes } from '@ioc:Adonis/Lucid/Model'
  import { ExtractModelRelations, RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'

  /**
   * ------------------------------------------------------
   *  Helpers
   * ------------------------------------------------------
   */

  /**
   * Extracts the attributes accepted by the lucid model set on a
   * factory
   */
  export type ExtractFactoryAttributes<
    T extends FactoryModelContract<LucidModel>
  > = Partial<ModelAttributes<InstanceType<T['model']>>>

  /**
   * ------------------------------------------------------
   *  Callbacks
   * ------------------------------------------------------
   */

  /**
   * Function to return the model attributes.
   */
  export type DefineCallback<Model extends LucidModel> = (
    ctx: FactoryContextContract,
  ) => Promise<Partial<ModelAttributes<InstanceType<Model>>>> | Partial<ModelAttributes<InstanceType<Model>>>

  /**
   * Function to initiate a model instance. It will receive the
   * attributes returned by the `define` method
   */
  export type NewUpCallback<T extends FactoryModelContract<LucidModel>> = (
    attributes: ExtractFactoryAttributes<T>,
    ctx: FactoryContextContract,
  ) => InstanceType<T['model']>

  /**
   * Function to merge attributes defined during runtime
   */
  export type MergeCallback<T extends FactoryModelContract<LucidModel>> = (
    model: InstanceType<T['model']>,
    attributes: ExtractFactoryAttributes<T>,
    ctx: FactoryContextContract,
  ) => void

  /**
   * Callback to define a new model state
   */
  export type StateCallback<Model extends LucidRow> = (
    model: Model,
    ctx: FactoryContextContract,
  ) => any | Promise<any>

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
    faker: {
      lorem: {
        sentence (count?: number): string,
      },
    },
    sequence: {
      username: string,
      email: string,
    },
    isStubbed: boolean,
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
    relation: RelationshipsContract,

    /**
     * Pass context to the relationship. Must be done everytime, so that
     * relationships uses the same transaction as the parent model
     */
    useCtx (ctx: FactoryContextContract): this

    /**
     * Create and persist
     */
    create (parent: LucidRow, callback?: RelationCallback, count?: number): Promise<void>

    /**
     * Create and stub
     */
    make (parent: LucidRow, callback?: RelationCallback, count?: number): Promise<void>
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
     * Merge custom set of attributes. They are passed to the merge method of
     * the model factory
     *
     * For `createMany` and `makeMany`, you can pass an array of attributes mapped
     * according to the array index.
     */
    merge (attributes: OneOrMany<ExtractFactoryAttributes<FactoryModel>>): this

    /**
     * Define custom runtime context. This method is usually called by
     * the relationships to ensure a single context is used by the
     * parent and relationship factories.
     *
     * Do not define a custom context, unless you know what you are really
     * doing.
     */
    useCtx (ctx: FactoryContextContract): this

    /**
     * Create model instance.
     */
    make (
      callback?: (
        model: InstanceType<FactoryModel['model']>,
        ctx: FactoryContextContract,
      ) => void
    ): Promise<InstanceType<FactoryModel['model']>>

    /**
     * Create and persist model instance
     */
    create (
      callback?: (
        model: InstanceType<FactoryModel['model']>,
        ctx: FactoryContextContract,
      ) => void
    ): Promise<InstanceType<FactoryModel['model']>>

    /**
     * Create more than one model instance
     */
    makeMany (
      count: number,
      callback?: (
        model: InstanceType<FactoryModel['model']>,
        ctx: FactoryContextContract,
      ) => void
    ): Promise<InstanceType<FactoryModel['model']>[]>

    /**
     * Create and persist more than one model instance
     */
    createMany (
      count: number,
      callback?: (
        model: InstanceType<FactoryModel['model']>,
        ctx: FactoryContextContract,
      ) => void
    ): Promise<InstanceType<FactoryModel['model']>[]>
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
    newUp (callback: NewUpCallback<this>): this
    merge (callback: MergeCallback<this>): this

    /**
     * Define custom state for the factory. When executing the factory,
     * you can apply the pre-defined states
     */
    state<K extends string> (
      state: K,
      callback: StateCallback<InstanceType<Model>>,
    ): this & { states: { [P in K]: StateCallback<InstanceType<Model>> } }

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
   * ------------------------------------------------------
   *  Manager to register new factories
   * ------------------------------------------------------
   */

  /**
   * Factory manager to define new factories
   */
  export interface FactoryManager {
    /**
     * Define a custom factory
     */
    define<Model extends LucidModel> (
      model: Model,
      callback: DefineCallback<Model>
    ): FactoryModelContract<Model>
  }

  const Factory: FactoryManager
  export default Factory
}
