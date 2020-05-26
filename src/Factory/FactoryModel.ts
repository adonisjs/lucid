/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { LucidRow, LucidModel } from '@ioc:Adonis/Lucid/Model'
import { ExtractModelRelations, RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'

import {
  StateCallback,
  MergeCallback,
  NewUpCallback,
  DefineCallback,
  FactoryModelContract,
  FactoryRelationContract,
} from '@ioc:Adonis/Lucid/Factory'

import { HasOne } from './Relations/HasOne'
import { HasMany } from './Relations/HasMany'
import { BelongsTo } from './Relations/BelongsTo'
import { ManyToMany } from './Relations/ManyToMany'

import { FactoryBuilder } from './FactoryBuilder'

/**
 * Factory model exposes the API to define a model factory with custom
 * states and relationships
 */
export class FactoryModel<Model extends LucidModel> implements FactoryModelContract<Model> {
  /**
   * Method to instantiate a new model instance. This method can be
   * overridden using the `newUp` public method.
   */
  public newUpModelInstance: NewUpCallback<FactoryModelContract<LucidModel>> = function (
    attributes: any,
  ) {
    const modelInstance = new this.model()
    modelInstance.merge(attributes)
    return modelInstance
  }.bind(this)

  /**
   * Method to merge runtime attributes with the model instance. This method
   * can be overridden using the `merge` method.
   */
  public mergeAttributes: MergeCallback<FactoryModelContract<LucidModel>> = function (
    model: LucidRow,
    attributes: any,
  ) {
    model.merge(attributes)
  }.bind(this)

  /**
   * A collection of factory states
   */
  public states: { [key: string]: StateCallback<LucidRow> } = {}

  /**
   * A collection of factory relations
   */
  public relations: { [relation: string]: FactoryRelationContract } = {}

  constructor (public model: Model, public define: DefineCallback<LucidModel>) {
  }

  /**
   * Returns state callback defined on the model factory. Raises an
   * exception, when state is not registered
   */
  public getState (state: string): StateCallback<LucidRow> {
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
  public getRelation (relation: string): FactoryRelationContract {
    const relationship = this.relations[relation]
    if (!relationship) {
      throw new Error(`Cannot setup undefined relationship "${relation}". Double check the model factory`)
    }

    return relationship
  }

  /**
   * Define custom state for the factory. When executing the factory,
   * you can apply the pre-defined states
   */
  public state (state: string, callback: StateCallback<InstanceType<Model>>): any {
    this.states[state] = callback
    return this
  }

  /**
   * Define a relationship on another factory
   */
  public relation<K extends ExtractModelRelations<InstanceType<Model>>> (
    relation: Extract<K, string>,
    callback: any,
  ): any {
    const modelRelation = this.model.$getRelation(relation) as RelationshipsContract

    /**
     * Only whitelisted relationships are allowed on the factory
     */
    if (!modelRelation) {
      throw new Error([
        `Cannot define "${relation}" relationship.`,
        `The relationship must exist on the "${this.model.name}" model first`,
      ].join(' '))
    }

    switch (modelRelation.type) {
      case 'belongsTo':
        this.relations[relation] = new BelongsTo(modelRelation, callback)
        break
      case 'hasOne':
        this.relations[relation] = new HasOne(modelRelation, callback)
        break
      case 'hasMany':
        this.relations[relation] = new HasMany(modelRelation, callback)
        break
      case 'manyToMany':
        this.relations[relation] = new ManyToMany(modelRelation, callback)
        break
      case 'hasManyThrough':
        throw new Error([
          `Cannot define "${relation}" relationship.`,
          '"hasManyThrough" relationship does not have any persistance API',
        ].join(' '))
    }

    return this
  }

  /**
   * Define a custom `newUp` method
   */
  public newUp (callback: NewUpCallback<FactoryModelContract<LucidModel>>): this {
    this.newUpModelInstance = callback
    return this
  }

  /**
   * Define a custom `merge` method
   */
  public merge (callback: MergeCallback<FactoryModelContract<any>>): this {
    this.mergeAttributes = callback
    return this
  }

  /**
   * Build factory model and return factory builder. The builder is then
   * used to make/create model instances
   */
  public build () {
    return new FactoryBuilder(this)
  }
}
