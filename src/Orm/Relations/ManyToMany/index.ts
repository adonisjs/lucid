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
import { ManyToManyRelationContract, ManyToManyRelationOptions } from '@ioc:Adonis/Lucid/Relations'

import { ManyToManyQueryClient } from './QueryClient'
import { KeysExtractor } from '../KeysExtractor'
import { ensureRelationIsBooted } from '../../../utils'

/**
 * Manages loading and persisting many to many relationship
 */
export class ManyToMany implements ManyToManyRelationContract<
ModelConstructorContract,
ModelConstructorContract
> {
  public type = 'manyToMany' as const
  public booted: boolean = false
  public relatedModel = this.options.relatedModel
  public serializeAs = this.options.serializeAs || this.relationName

  /**
   * Available after boot is invoked
   */
  public localKey: string
  public localCastAsKey: string

  public relatedKey: string
  public relatedCastAsKey: string

  public pivotForeignKey: string
  public pivotRelatedForeignKey: string

  public pivotTable: string
  public extrasPivotColumns: string[] = this.options.pivotColumns || []

  constructor (
    public relationName: string,
    private options: ManyToManyRelationOptions,
    public model: ModelConstructorContract,
  ) {
  }

  /**
   * Returns the alias for the pivot key
   */
  public pivotAlias (key: string): string {
    return `pivot_${key}`
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
    const { localKey, relatedKey } = new KeysExtractor(this.model, this.relationName, {
      localKey: {
        model: this.model,
        key: (
          this.options.localKey ||
          this.model.$configurator.getLocalKey(this.type, this.model, relatedModel)
        ),
      },
      relatedKey: {
        model: relatedModel,
        key: (
          this.options.relatedKey ||
          this.model.$configurator.getLocalKey(this.type, this.model, relatedModel)
        ),
      },
    }).extract()

    this.pivotTable = this.options.pivotTable || this.model.$configurator.getPivotTableName(
      this.type,
      this.model,
      relatedModel,
      this.relationName,
    )

    /**
     * Keys on the parent model
     */
    this.localKey = localKey.attributeName
    this.localCastAsKey = localKey.castAsKey

    /**
     * Keys on the related model
     */
    this.relatedKey = relatedKey.attributeName
    this.relatedCastAsKey = relatedKey.castAsKey

    /**
     * Parent model foreign key in the pivot table
     */
    this.pivotForeignKey =
      this.options.pivotForeignKey ||
      this.model.$configurator.getPivotForeignKey(this.type, this.model, relatedModel, this.relationName)

    /**
     * Related model foreign key in the pivot table
     */
    this.pivotRelatedForeignKey =
      this.options.pivotRelatedForeignKey ||
      this.model.$configurator.getPivotForeignKey(this.type, relatedModel, this.model, this.relationName)

    /**
     * Booted successfully
     */
    this.booted = true
  }

  /**
   * Set related model instances
   */
  public $setRelated (parent: ModelContract, related: ModelContract[]): void {
    ensureRelationIsBooted(this)
    parent.$setRelated(this.relationName as any, related)
  }

  /**
   * Push related model instance(s)
   */
  public $pushRelated (parent: ModelContract, related: ModelContract | ModelContract[]): void {
    ensureRelationIsBooted(this)
    parent.$pushRelated(this.relationName as any, related as any)
  }

  /**
   * Finds and set the related model instances next to the parent
   * models.
   */
  public $setRelatedForMany (parent: ModelContract[], related: ModelContract[]): void {
    ensureRelationIsBooted(this)
    const pivotForeignKeyAlias = this.pivotAlias(this.pivotForeignKey)

    parent.forEach((parentModel) => {
      this.$setRelated(
        parentModel,
        related.filter((relatedModel) => {
          const value = parentModel[this.localKey]
          return value !== undefined && relatedModel.$extras[pivotForeignKeyAlias] === value
        }),
      )
    })
  }

  /**
   * Returns an instance of query client for invoking queries
   */
  public client (parent: ModelContract | ModelContract[], client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return new ManyToManyQueryClient(parent, client, this)
  }
}
