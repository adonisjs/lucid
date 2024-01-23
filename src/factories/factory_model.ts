/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import Hooks from '@poppinss/hooks'
import { LucidModel, ModelAdapterOptions } from '../types/model.js'
import { ExtractModelRelations, RelationshipsContract } from '../types/relations.js'

import {
  EventsList,
  HooksHandler,
  StateCallback,
  MergeCallback,
  NewUpCallback,
  DefineCallback,
  FactoryModelContract,
  FactoryRelationContract,
  FactoryBuilderQueryContract,
  FactoryBuilderContract,
} from '../types/factory.js'

import { FactoryManager } from './main.js'
import { HasOne } from './relations/has_one.js'
import { HasMany } from './relations/has_many.js'
import { FactoryBuilder } from './factory_builder.js'
import { BelongsTo } from './relations/belongs_to.js'
import { ManyToMany } from './relations/many_to_many.js'

/**
 * Factory model exposes the API to define a model factory with custom
 * states and relationships
 */
export class FactoryModel<Model extends LucidModel> implements FactoryModelContract<Model> {
  /**
   * Method to instantiate a new model instance. This method can be
   * overridden using the `newUp` public method.
   */
  newUpModelInstance: NewUpCallback<LucidModel, FactoryModelContract<LucidModel>> = (
    attributes,
    _,
    model
  ) => {
    /**
     * Handling case, where someone returns model instance directly
     */
    if (attributes instanceof model) {
      return attributes
    }

    const modelInstance = new model()
    modelInstance.merge(attributes)
    return modelInstance
  }

  /**
   * Method to merge runtime attributes with the model instance. This method
   * can be overridden using the `merge` method.
   */
  mergeAttributes: MergeCallback<LucidModel, FactoryModelContract<LucidModel>> = (
    model,
    attributes
  ) => {
    model.merge(attributes)
  }

  /**
   * A collection of factory states
   */
  states: { [key: string]: StateCallback<Model> } = {}

  /**
   * A collection of factory relations
   */
  relations: { [relation: string]: FactoryRelationContract } = {}

  /**
   * A set of registered hooks
   */
  hooks = new Hooks()

  constructor(
    public model: Model,
    public define: DefineCallback<Model>,
    public manager: FactoryManager
  ) {}

  /**
   * Register a before event hook
   */
  before(event: 'makeStubbed' | 'create', handler: HooksHandler<Model, this>): this {
    this.hooks.add(`before:${event}`, handler)
    return this
  }

  /**
   * Register an after event hook
   */
  after(event: EventsList, handler: HooksHandler<Model, this>): this {
    this.hooks.add(`after:${event}`, handler)
    return this
  }

  /**
   * Returns state callback defined on the model factory. Raises an
   * exception, when state is not registered
   */
  getState(state: string): StateCallback<Model> {
    const stateCallback = this.states[state]
    if (!stateCallback) {
      throw new Error(`Cannot apply undefined state "${state}". Double check the model factory`)
    }

    return stateCallback
  }

  /**
   * Returns the pre-registered relationship factory function, along with
   * the original model relation.
   */
  getRelation(relation: keyof this['relations']): FactoryRelationContract {
    const relationship = this.relations[relation as string]
    if (!relationship) {
      throw new Error(
        `Cannot reference "${String(
          relation
        )}" relationship. Make sure to setup the relationship within the factory`
      )
    }

    return relationship
  }

  /**
   * Define custom state for the factory. When executing the factory,
   * you can apply the pre-defined states
   */
  state<K extends string>(
    state: K,
    callback: StateCallback<Model>
  ): this & { states: { [P in K]: StateCallback<Model> } } {
    this.states[state] = callback
    return this as this & { states: { [P in K]: StateCallback<Model> } }
  }

  /**
   * Define a relationship on another factory
   */
  relation<K extends ExtractModelRelations<InstanceType<Model>>, Relation>(
    relation: K,
    callback: Relation
  ): this & { relations: { [P in K]: Relation } } {
    const modelRelation = this.model.$getRelation(relation) as RelationshipsContract

    /**
     * Only whitelisted relationships are allowed on the factory
     */
    if (!modelRelation) {
      throw new Error(
        [
          `Cannot define "${String(relation)}" relationship.`,
          `The relationship must exist on the "${this.model.name}" model first`,
        ].join(' ')
      )
    }

    switch (modelRelation.type) {
      case 'belongsTo':
        this.relations[relation as string] = new BelongsTo(modelRelation, callback as any)
        break
      case 'hasOne':
        this.relations[relation as string] = new HasOne(modelRelation, callback as any)
        break
      case 'hasMany':
        this.relations[relation as string] = new HasMany(modelRelation, callback as any)
        break
      case 'manyToMany':
        this.relations[relation as string] = new ManyToMany(modelRelation, callback as any)
        break
      case 'hasManyThrough':
        throw new Error(
          [
            `Cannot define "${String(relation)}" relationship.`,
            '"hasManyThrough" relationship does not have any persistance API',
          ].join(' ')
        )
    }

    return this as this & { relations: { [P in K]: Relation } }
  }

  /**
   * Define a custom `newUp` method
   */
  newUp(callback: NewUpCallback<any, any>): this {
    this.newUpModelInstance = callback
    return this
  }

  /**
   * Define a custom `merge` method
   */
  merge(callback: MergeCallback<any, any>): this {
    this.mergeAttributes = callback
    return this
  }

  /**
   * Build factory model and return factory builder. The builder is then
   * used to make/create model instances
   */
  build() {
    /**
     * Return a build object, which proxies all of the factory builder
     * method and invokes them with a fresh instance.
     */
    const builder: FactoryBuilderQueryContract<Model, FactoryModelContract<Model>> = {
      factory: this as FactoryModelContract<Model>,
      query(
        options?: ModelAdapterOptions,
        viaRelation?: FactoryRelationContract
      ): FactoryBuilderContract<Model, FactoryModelContract<Model>> {
        return new FactoryBuilder(
          this.factory as unknown as FactoryModel<LucidModel>,
          options,
          viaRelation
        ) as unknown as FactoryBuilderContract<Model, FactoryModelContract<Model>>
      },
      tap(callback) {
        return this.query().tap(callback)
      },
      client(...args) {
        return this.query().client(...args)
      },
      connection(...args) {
        return this.query().connection(...args)
      },
      apply(...args) {
        return this.query().apply(...args)
      },
      with(relation, ...args) {
        return this.query().with(relation, ...args)
      },
      merge(attributes) {
        return this.query().merge(attributes)
      },
      mergeRecursive(attributes) {
        return this.query().mergeRecursive(attributes)
      },
      useCtx(ctx) {
        return this.query().useCtx(ctx)
      },
      make() {
        return this.query().make()
      },
      makeStubbed() {
        return this.query().makeStubbed()
      },
      create() {
        return this.query().create()
      },
      makeMany(count) {
        return this.query().makeMany(count)
      },
      makeStubbedMany(count) {
        return this.query().makeStubbedMany(count)
      },
      createMany(count) {
        return this.query().createMany(count)
      },
      pivotAttributes(attributes) {
        return this.query().pivotAttributes(attributes)
      },
    }

    return builder as any
  }
}
