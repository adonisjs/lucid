/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { HasManyRelationContract, RelationOptions } from '@ioc:Adonis/Lucid/Relations'

import { BaseRelation } from '../Base'
import { HasManyQueryClient } from './QueryClient'

/**
 * Manages loading and persisting has many relationship
 */
export class HasMany extends BaseRelation implements HasManyRelationContract<
ModelConstructorContract,
ModelConstructorContract
> {
  public $type = 'hasMany' as const

  /**
   * Available after boot is invoked
   */
  public $localKey: string
  public $localCastAsKey: string
  public $foreignKey: string
  public $foreignCastAsKey: string

  constructor (
    relationName: string,
    options: RelationOptions,
    model: ModelConstructorContract,
  ) {
    super(relationName, options, model)
  }

  /**
   * Boot the relationship and ensure that all keys are in
   * place for queries to do their job.
   */
  public $boot () {
    if (this.$booted) {
      return
    }

    /**
     * Extracting keys from the model and the relation model. The keys
     * extractor ensures all the required columns are defined on
     * the models for the relationship to work
     */
    const { localKey, foreignKey } = this.$extractKeys({
      localKey: {
        model: this.$model,
        key: (
          this.$options.localKey ||
          this.$model.$configurator.getLocalKey(this.$type, this.$model, this.$relatedModel())
        ),
      },
      foreignKey: {
        model: this.$relatedModel(),
        key: (
          this.$options.foreignKey ||
          this.$model.$configurator.getForeignKey(this.$type, this.$model, this.$relatedModel())
        ),
      },
    })

    /**
     * Keys on the parent model
     */
    this.$localKey = localKey.attributeName
    this.$localCastAsKey = localKey.castAsKey

    /**
     * Keys on the related model
     */
    this.$foreignKey = foreignKey.attributeName
    this.$foreignCastAsKey = foreignKey.castAsKey

    /**
     * Booted successfully
     */
    this.$booted = true
  }

  /**
   * Set related model instances
   */
  public $setRelated (parent: ModelContract, related: ModelContract[]): void {
    this.$ensureIsBooted()
    parent.$setRelated(this.$relationName as any, related)
  }

  /**
   * Push related model instance(s)
   */
  public $pushRelated (parent: ModelContract, related: ModelContract | ModelContract[]): void {
    this.$ensureIsBooted()
    parent.$pushRelated(this.$relationName as any, related as any)
  }

  /**
   * Finds and set the related model instances next to the parent
   * models.
   */
  public $setRelatedForMany (parent: ModelContract[], related: ModelContract[]): void {
    this.$ensureIsBooted()
    parent.forEach((parentModel) => {
      const value = parentModel[this.$localKey]
      this.$setRelated(
        parentModel,
        related.filter((relatedModel) => {
          return value !== undefined && relatedModel[this.$foreignKey] === value
        }),
      )
    })
  }

  /**
   * Returns an instance of query client for invoking queries
   */
  public client (parent: ModelContract | ModelContract[], client: QueryClientContract): any {
    this.$ensureIsBooted()
    return new HasManyQueryClient(parent, client, this)
  }
}
