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
import { HasOneRelationContract, RelationOptions } from '@ioc:Adonis/Lucid/Relations'

import { HasOneQueryClient } from './QueryClient'
import { KeysExtractor } from '../KeysExtractor'
import { ensureRelationIsBooted } from '../../../utils'

/**
 * Manages loading and persisting has one relationship
 */
export class HasOne implements HasOneRelationContract<
ModelConstructorContract,
ModelConstructorContract
> {
  public type = 'hasOne' as const
  public booted: boolean = false
  public relatedModel = this.options.relatedModel
  public serializeAs = this.options.serializeAs === undefined
    ? this.relationName
    : this.options.serializeAs

  /**
   * Available after boot is invoked
   */
  public localKey: string
  public localCastAsKey: string
  public foreignKey: string
  public foreignCastAsKey: string

  constructor (
    public relationName: string,
    private options: RelationOptions,
    public model: ModelConstructorContract,
  ) {
  }

  /**
   * Boot the relationship and ensure that all keys are in
   * place for queries to do their job.
   */
  public boot () {
    if (this.booted) {
      return
    }

    const relatedModel = this.relatedModel()

    /**
     * Extracting keys from the model and the relation model. The keys
     * extractor ensures all the required columns are defined on
     * the models for the relationship to work
     */
    const { localKey, foreignKey } = new KeysExtractor(this.model, this.relationName, {
      localKey: {
        model: this.model,
        key: (
          this.options.localKey ||
          this.model.$configurator.getLocalKey(this.type, this.model, relatedModel)
        ),
      },
      foreignKey: {
        model: relatedModel,
        key: (
          this.options.foreignKey ||
          this.model.$configurator.getForeignKey(this.type, this.model, relatedModel)
        ),
      },
    }).extract()

    /**
     * Keys on the parent model
     */
    this.localKey = localKey.attributeName
    this.localCastAsKey = localKey.castAsKey

    /**
     * Keys on the related model
     */
    this.foreignKey = foreignKey.attributeName
    this.foreignCastAsKey = foreignKey.castAsKey

    /**
     * Booted successfully
     */
    this.booted = true
  }

  /**
   * Set related model instance
   */
  public $setRelated (parent: ModelContract, related: ModelContract | null): void {
    ensureRelationIsBooted(this)
    if (!related) {
      return
    }

    parent.$setRelated(this.relationName as any, related)
  }

  /**
   * Push related model instance
   */
  public $pushRelated (parent: ModelContract, related: ModelContract | null): void {
    ensureRelationIsBooted(this)

    if (!related) {
      return
    }

    parent.$pushRelated(this.relationName as any, related)
  }

  /**
   * Finds and set the related model instance next to the parent
   * models.
   */
  public $setRelatedForMany (parent: ModelContract[], related: ModelContract[]): void {
    ensureRelationIsBooted(this)

    /**
     * The related model will always be equal or less than the parent
     * models. So we loop over them to lower down the number of
     * iterations.
     */
    related.forEach((relatedModel) => {
      const match = parent.find((parentModel) => {
        const value = parentModel[this.localKey]
        return value !== undefined && value === relatedModel[this.foreignKey]
      })
      if (match) {
        this.$setRelated(match, relatedModel)
      }
    })
  }

  /**
   * Returns an instance of query client for invoking queries
   */
  public client (parent: ModelContract | ModelContract[], client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return new HasOneQueryClient(this, parent, client)
  }
}
