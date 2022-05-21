/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { LucidRow, LucidModel, ModelAdapterOptions, ModelObject } from '@ioc:Adonis/Lucid/Orm'
import {
  FactoryModelContract,
  FactoryContextContract,
  FactoryBuilderContract,
  FactoryRelationContract,
} from '@ioc:Adonis/Lucid/Factory'

import { FactoryModel } from './FactoryModel'
import { FactoryContext } from './FactoryContext'

/**
 * Factory builder exposes the API to create/persist factory model instances.
 */
export class FactoryBuilder implements FactoryBuilderContract<FactoryModelContract<LucidModel>> {
  /**
   * Relationships to setup. Do note: It is possible to load one relationship
   * twice. A practical use case is to apply different states. For example:
   *
   * Make user with "3 active posts" and "2 draft posts"
   */
  private withRelations: {
    name: string
    count?: number
    callback?: (factory: any) => void
  }[] = []

  /**
   * An array of callbacks to execute before persisting the model instance
   */
  private tapCallbacks: ((row: LucidRow, state: FactoryContextContract, builder: this) => void)[] =
    []

  /**
   * Belongs to relationships are treated different, since they are
   * persisted before the parent model
   */
  private withBelongsToRelations: {
    name: string
    count?: number
    callback?: (factory: any) => void
  }[] = []

  /**
   * The current index. Updated by `makeMany` and `createMany`
   */
  private currentIndex = 0

  /**
   * Custom attributes to pass to model merge method
   */
  private attributes: any = {}

  /**
   * Custom attributes to pass to relationship merge methods
   */
  private recursiveAttributes: any = {}

  /**
   * States to apply. One state can be applied only once and hence
   * a set is used.
   */
  private appliedStates: Set<string> = new Set()

  /**
   * Custom context passed using `useCtx` method. It not defined, we will
   * create one inline inside `create` and `make` methods
   */
  private ctx?: FactoryContextContract

  /**
   * Pivot attributes for a many to many relationship
   */
  private attributesForPivotTable?: ModelObject | ModelObject[]

  /**
   * Instead of relying on the `FactoryModelContract`, we rely on the
   * `FactoryModel`, since it exposes certain API's required for
   * the runtime operations and those API's are not exposed
   * on the interface to keep the API clean
   */
  constructor(
    public factory: FactoryModel<LucidModel>,
    private options?: ModelAdapterOptions,
    /**
     * The relationship via which this factory builder was
     * created
     */ private viaRelation?: FactoryRelationContract
  ) {}

  /**
   * Access the parent relationship for which the model instance
   * is created
   */
  public get parent() {
    return this.viaRelation ? this.viaRelation.parent : undefined
  }

  /**
   * Returns factory state
   */
  private async getCtx(isStubbed: boolean, withTransaction: boolean) {
    if (withTransaction === false) {
      return new FactoryContext(isStubbed, undefined)
    }

    const client = this.factory.model.$adapter.modelConstructorClient(
      this.factory.model,
      this.options
    )

    const trx = await client.transaction()
    return new FactoryContext(isStubbed, trx)
  }

  /**
   * Returns attributes to merge for a given index
   */
  private getMergeAttributes(index: number) {
    const attributes = Array.isArray(this.attributes) ? this.attributes[index] : this.attributes
    const recursiveAttributes = Array.isArray(this.recursiveAttributes)
      ? this.recursiveAttributes[index]
      : this.recursiveAttributes

    return {
      ...recursiveAttributes,
      ...attributes,
    }
  }

  /**
   * Returns a new model instance with filled attributes
   */
  private async getModelInstance(ctx: FactoryContextContract): Promise<LucidRow> {
    const modelAttributes = await this.factory.define(ctx)
    const modelInstance = this.factory.newUpModelInstance(
      modelAttributes,
      ctx,
      this.factory.model,
      this
    )

    this.factory.mergeAttributes(
      modelInstance,
      this.getMergeAttributes(this.currentIndex),
      ctx,
      this
    )

    return modelInstance
  }

  /**
   * Apply states by invoking state callback
   */
  private async applyStates(modelInstance: LucidRow, ctx: FactoryContextContract) {
    for (let state of this.appliedStates) {
      await this.factory.getState(state)(modelInstance, ctx, this)
    }
  }

  /**
   * Invoke tap callbacks
   */
  private invokeTapCallback(modelInstance: LucidRow, ctx: FactoryContextContract) {
    this.tapCallbacks.forEach((callback) => callback(modelInstance, ctx, this))
  }

  /**
   * Compile factory by instantiating model instance, applying merge
   * attributes, apply state
   */
  private async compile(ctx: FactoryContext) {
    try {
      /**
       * Newup the model instance
       */
      const modelInstance = await this.getModelInstance(ctx)

      /**
       * Apply state
       */
      await this.applyStates(modelInstance, ctx)

      /**
       * Invoke tap callbacks as the last step
       */
      this.invokeTapCallback(modelInstance, ctx)

      /**
       * Pass pivot attributes to the relationship instance
       */
      if (this.viaRelation && this.viaRelation.pivotAttributes) {
        this.viaRelation.pivotAttributes(this.attributesForPivotTable || {})
      }

      return modelInstance
    } catch (error) {
      if (!this.ctx && ctx.$trx) {
        await ctx.$trx.rollback()
      }

      throw error
    }
  }

  /**
   * Makes relationship instances. Call [[createRelation]] to
   * also persist them.
   */
  private async makeRelations(modelInstance: LucidRow, ctx: FactoryContextContract) {
    for (let { name, count, callback } of this.withBelongsToRelations) {
      const relation = this.factory.getRelation(name)
      await relation
        .useCtx(ctx)
        .merge(this.recursiveAttributes)
        .make(modelInstance, callback, count)
    }

    for (let { name, count, callback } of this.withRelations) {
      const relation = this.factory.getRelation(name)
      await relation
        .useCtx(ctx)
        .merge(this.recursiveAttributes)
        .make(modelInstance, callback, count)
    }
  }

  /**
   * Makes and persists relationship instances
   */
  private async createRelations(
    modelInstance: LucidRow,
    ctx: FactoryContextContract,
    cycle: 'before' | 'after'
  ) {
    const relationships = cycle === 'before' ? this.withBelongsToRelations : this.withRelations

    for (let { name, count, callback } of relationships) {
      const relation = this.factory.getRelation(name)
      await relation
        .useCtx(ctx)
        .merge(this.recursiveAttributes)
        .create(modelInstance, callback, count)
    }
  }

  /**
   * Persist the model instance along with its relationships
   */
  private async persistModelInstance(modelInstance: LucidRow, ctx: FactoryContextContract) {
    /**
     * Fire the after "make" hook. There is no before make hook
     */
    await this.factory.hooks.exec('after', 'make', this, modelInstance, ctx)

    /**
     * Fire the before "create" hook
     */
    await this.factory.hooks.exec('before', 'create', this, modelInstance, ctx)

    /**
     * Sharing transaction with the model
     */
    modelInstance.$trx = ctx.$trx

    /**
     * Create belongs to relationships before calling the save method. Even though
     * we can update the foriegn key after the initial insert call, we avoid it
     * for cases, where FK is a not nullable.
     */
    await this.createRelations(modelInstance, ctx, 'before')

    /**
     * Persist model instance
     */
    await modelInstance.save()

    /**
     * Create relationships that are meant to be created after the parent
     * row. Basically all types of relationships except belongsTo
     */
    await this.createRelations(modelInstance, ctx, 'after')

    /**
     * Fire after hook before the transaction is committed, so that
     * hook can run db operations using the same transaction
     */
    await this.factory.hooks.exec('after', 'create', this, modelInstance, ctx)
  }

  /**
   * Define custom database connection
   */
  public connection(connection: string): this {
    this.options = this.options || {}
    this.options.connection = connection
    return this
  }

  /**
   * Define custom query client
   */
  public client(client: QueryClientContract): this {
    this.options = this.options || {}
    this.options.client = client
    return this
  }

  /**
   * Define custom context. Usually called by the relationships
   * to share the parent context with relationship factory
   */
  public useCtx(ctx: FactoryContextContract): this {
    this.ctx = ctx
    return this
  }

  /**
   * Load relationship
   */
  public with(name: string, count?: number, callback?: (factory: never) => void): this {
    const relation = this.factory.getRelation(name)

    if (relation.relation.type === 'belongsTo') {
      this.withBelongsToRelations.push({ name, count, callback })
      return this
    }

    this.withRelations.push({ name, count, callback })
    return this
  }

  /**
   * Apply one or more states. Multiple calls to apply a single
   * state will be ignored
   */
  public apply(...states: string[]): this {
    states.forEach((state) => this.appliedStates.add(state))
    return this
  }

  /**
   * Fill custom set of attributes. They are passed down to the newUp
   * method of the factory
   */
  public merge(attributes: any) {
    this.attributes = attributes
    return this
  }

  /**
   * Merge custom set of attributes with the correct factory builder
   * model and all of its relationships as well
   */
  public mergeRecursive(attributes: any): this {
    this.recursiveAttributes = attributes
    return this
  }

  /**
   * Define pivot attributes when persisting a many to many
   * relationship. Results in a noop, when not called
   * for a many to many relationship
   */
  public pivotAttributes(attributes: ModelObject | ModelObject[]): this {
    this.attributesForPivotTable = attributes
    return this
  }

  /**
   * Tap into the persistence layer of factory builder. Allows one
   * to modify the model instance just before it is persisted
   * to the database
   */
  public tap(
    callback: (row: LucidRow, state: FactoryContextContract, builder: this) => void
  ): this {
    this.tapCallbacks.push(callback)
    return this
  }

  /**
   * Make model instance. Relationships are not processed with the make function.
   */
  public async make() {
    const ctx = this.ctx || (await this.getCtx(false, false))
    const modelInstance = await this.compile(ctx)
    await this.factory.hooks.exec('after', 'make', this, modelInstance, ctx)
    return modelInstance
  }

  /**
   * Create many of the factory model instances
   */
  public async makeMany(count: number) {
    let modelInstances: LucidRow[] = []

    const counter = new Array(count).fill(0).map((_, i) => i)
    for (let index of counter) {
      this.currentIndex = index
      modelInstances.push(await this.make())
    }

    return modelInstances
  }

  /**
   * Returns a model instance without persisting it to the database.
   * Relationships are still loaded and states are also applied.
   */
  public async makeStubbed() {
    const ctx = this.ctx || (await this.getCtx(true, false))
    const modelInstance = await this.compile(ctx)

    await this.factory.hooks.exec('after', 'make', this, modelInstance, ctx)
    await this.factory.hooks.exec('before', 'makeStubbed', this, modelInstance, ctx)

    const id = modelInstance.$primaryKeyValue || this.factory.manager.getNextId(modelInstance)
    modelInstance[this.factory.model.primaryKey] = id

    /**
     * Make relationships. The relationships will be not persisted
     */
    await this.makeRelations(modelInstance, ctx)

    /**
     * Fire the after hook
     */
    await this.factory.hooks.exec('after', 'makeStubbed', this, modelInstance, ctx)

    return modelInstance
  }

  /**
   * Create many of model factory instances
   */
  public async makeStubbedMany(count: number) {
    let modelInstances: LucidRow[] = []

    const counter = new Array(count).fill(0).map((_, i) => i)
    for (let index of counter) {
      this.currentIndex = index
      modelInstances.push(await this.makeStubbed())
    }

    return modelInstances
  }

  /**
   * Similar to make, but also persists the model instance to the
   * database.
   */
  public async create() {
    /**
     * Use pre-defined ctx or create a new one
     */
    const ctx = this.ctx || (await this.getCtx(false, true))

    /**
     * Compile a model instance
     */
    const modelInstance = await this.compile(ctx)

    try {
      await this.persistModelInstance(modelInstance, ctx)
      if (!this.ctx && ctx.$trx) {
        await ctx.$trx.commit()
      }

      return modelInstance
    } catch (error) {
      if (!this.ctx && ctx.$trx) {
        await ctx.$trx.rollback()
      }

      throw error
    }
  }

  /**
   * Create and persist many of factory model instances
   */
  public async createMany(count: number) {
    let modelInstances: LucidRow[] = []

    /**
     * Use pre-defined ctx or create a new one
     */
    const ctx = this.ctx || (await this.getCtx(false, true))

    const counter = new Array(count).fill(0).map((_, i) => i)

    try {
      for (let index of counter) {
        this.currentIndex = index

        /**
         * Compile a model instance
         */
        const modelInstance = await this.compile(ctx)
        await this.persistModelInstance(modelInstance, ctx)
        modelInstances.push(modelInstance)
      }
      if (!this.ctx && ctx.$trx) {
        await ctx.$trx.commit()
      }

      return modelInstances
    } catch (error) {
      if (!this.ctx && ctx.$trx) {
        await ctx.$trx.rollback()
      }

      throw error
    }
  }
}
