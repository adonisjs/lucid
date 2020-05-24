/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { LucidRow, LucidModel } from '@ioc:Adonis/Lucid/Model'
import {
  FactoryModelContract,
  FactoryBuilderContract,
} from '@ioc:Adonis/Lucid/Factory'

import { HasOne } from './Relations/HasOne'
import { HasMany } from './Relations/HasMany'
import { FactoryState } from './FactoryState'
import { BelongsTo } from './Relations/BelongsTo'
import { ManyToMany } from './Relations/ManyToMany'

/**
 * Factory builder exposes the API to create/persist factory model instances.
 */
export class FactoryBuilder implements FactoryBuilderContract<FactoryModelContract<LucidModel, any>> {
  /**
   * Relationships to setup. Do note: It is possible to load one relationship
   * twice. A practical use case is to apply different states. For example:
   *
   * Make user with "3 active posts" and "2 draft posts"
   */
  private withRelations: {
    name: string,
    count?: number,
    callback?: (factory: any) => void,
  }[] = []

  /**
   * The current index. Updated by `makeMany` and `createMany`
   */
  private currentIndex = 0

  /**
   * Custom attributes to pass to the newUp method
   */
  private attributes: any

  /**
   * States to apply. One state can be applied only once and hence
   * a set is used.
   */
  private appliedStates: Set<string> = new Set()

  constructor (private model: FactoryModelContract<LucidModel, any>) {
  }

  /**
   * Returns factory state
   */
  private async getFactoryState (isStubbed: boolean) {
    if (isStubbed === true) {
      return new FactoryState(isStubbed, undefined)
    }

    const client = this.model.model.$adapter.modelConstructorClient(this.model.model)
    const trx = await client.transaction()
    return new FactoryState(isStubbed, trx)
  }

  /**
   * Returns attributes for a given index
   */
  private getAttributesForIndex (index: number) {
    return Array.isArray(this.attributes) ? this.attributes[index] : this.attributes
  }

  /**
   * Returns the lucid model instance by invoking the `newUp` method
   * on the Factory model.
   */
  private async getModelInstance (state: FactoryState) {
    return await this.model.newUp(state, this.getAttributesForIndex(this.currentIndex))
  }

  /**
   * Apply states by invoking state callback
   */
  private async applyStates (modelInstance: LucidRow, factoryState: FactoryState) {
    for (let state of this.appliedStates) {
      await this.model.getState(state)(modelInstance, factoryState)
    }
  }

  /**
   * Makes relationship instances. Call [[createRelation]] to
   * also persist them.
   */
  private async makeRelations (modelInstance: LucidRow, state: FactoryState) {
    for (let { name, count, callback } of this.withRelations) {
      const { factory, relation } = this.model.getRelation(name)

      if (typeof (callback) === 'function') {
        callback(factory)
      }

      switch (relation.type) {
        case 'belongsTo':
          await new BelongsTo(relation).make(modelInstance, state, factory)
          break
        case 'hasOne':
          await new HasOne(relation).make(modelInstance, state, factory)
          break
        case 'hasMany':
          await new HasMany(relation).make(modelInstance, state, factory, count)
          break
        case 'manyToMany':
          await new ManyToMany(relation).make(modelInstance, state, factory, count)
          break
      }
    }
  }

  /**
   * Makes and persists relationship instances
   */
  public async createRelations (modelInstance: LucidRow, state: FactoryState) {
    for (let { name, count, callback } of this.withRelations) {
      const { factory, relation } = this.model.getRelation(name)
      if (typeof (callback) === 'function') {
        callback(factory)
      }

      switch (relation.type) {
        case 'belongsTo':
          await new BelongsTo(relation).create(modelInstance, state, factory)
          break
        case 'hasOne':
          await new HasOne(relation).create(modelInstance, state, factory)
          break
        case 'hasMany':
          await new HasMany(relation).create(modelInstance, state, factory, count)
          break
        case 'manyToMany':
          await new ManyToMany(relation).create(modelInstance, state, factory, count)
          break
      }
    }
  }

  /**
   * Load relationship
   */
  public with (relation: string, count?: number, callback?: (factory: never) => void): this {
    this.withRelations.push({ name: relation, count, callback })
    return this
  }

  /**
   * Apply one or more states. Multiple calls to apply a single
   * state will be ignored
   */
  public apply (...states: string[]): this {
    states.forEach((state) => this.appliedStates.add(state))
    return this
  }

  /**
   * Fill custom set of attributes. They are passed down to the newUp
   * method of the factory
   */
  public fill (attributes: any) {
    this.attributes = attributes
    return this
  }

  /**
   * Returns a model instance without persisting it to the database.
   * Relationships are still loaded and states are also applied.
   */
  public async make (
    state?: FactoryState,
    callback?: (model: LucidRow, state: FactoryState) => void,
  ) {
    const factoryState = state || await this.getFactoryState(true)

    const modelInstance = await this.getModelInstance(factoryState)
    this.applyStates(modelInstance, factoryState)

    /**
     * Invoke custom callback (if defined)
     */
    if (typeof (callback) === 'function') {
      callback(modelInstance, factoryState)
    }

    /**
     * Make relationships. Since, parent model is not persisted
     * the relationships are also not persisted
     */
    await this.makeRelations(modelInstance, factoryState)
    return modelInstance
  }

  /**
   * Similar to make, but also persists the model instance to the
   * database.
   */
  public async create (
    state?: FactoryState,
    callback?: (model: LucidRow, state: FactoryState) => void,
  ) {
    const factoryState = state || await this.getFactoryState(false)

    const modelInstance = await this.getModelInstance(factoryState)
    this.applyStates(modelInstance, factoryState)

    try {
      modelInstance.$trx = factoryState.$trx

      /**
       * Invoke custom callback (if defined)
       */
      if (typeof (callback) === 'function') {
        callback(modelInstance, factoryState)
      }

      /**
       * Persist model
       */
      await modelInstance.save()

      /**
       * Setup relationships (they are persisted too)
       */
      await this.createRelations(modelInstance, factoryState)
      if (!state && factoryState.$trx) {
        await factoryState.$trx.commit()
      }
      return modelInstance
    } catch (error) {
      if (!state && factoryState.$trx) {
        await factoryState.$trx.rollback()
      }
      throw error
    }
  }

  /**
   * Create many of factory model instances
   */
  public async makeMany (
    count: number,
    state?: FactoryState,
    callback?: (model: LucidRow, state: FactoryState) => void,
  ) {
    let modelInstances: LucidRow[] = []

    const counter = new Array(count).fill(0).map((_, i) => i)
    for (let index of counter) {
      this.currentIndex = index
      modelInstances.push(await this.make(state, callback))
    }

    return modelInstances
  }

  /**
   * Create and persist many of factory model instances
   */
  public async createMany (
    count: number,
    state?: FactoryState,
    callback?: (model: LucidRow, state: FactoryState) => void,
  ) {
    let modelInstances: LucidRow[] = []

    const counter = new Array(count).fill(0).map((_, i) => i)
    for (let index of counter) {
      this.currentIndex = index
      modelInstances.push(await this.create(state, callback))
    }

    return modelInstances
  }
}
