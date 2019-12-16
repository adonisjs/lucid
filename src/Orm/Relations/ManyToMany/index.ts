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

import { BaseRelation } from '../Base'
import { ManyToManyQueryClient } from './QueryClient'

export class ManyToMany extends BaseRelation implements ManyToManyRelationContract<
ModelConstructorContract,
ModelConstructorContract
> {
  public $type = 'manyToMany' as const

  /**
   * Available after boot is invoked
   */
  public $localKey: string
  public $localCastAsKey: string

  public $relatedKey: string
  public $relatedCastAsKey: string

  public $pivotForeignKey: string
  public $pivotRelatedForeignKey: string

  public $pivotTable: string
  public $extrasPivotColumns: string[] = this.manyToManyOptions.pivotColumns || []

  constructor (
    relationName: string,
    private manyToManyOptions: ManyToManyRelationOptions,
    model: ModelConstructorContract,
  ) {
    super(relationName, manyToManyOptions, model)
  }

  /**
   * Returns the alias for the pivot key
   */
  public pivotAlias (key) {
    return `pivot_${key}`
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
    const { localKey, relatedKey } = this.$extractKeys({
      localKey: {
        model: this.$model,
        key: (
          this.manyToManyOptions.localKey ||
          this.$model.$configurator.getLocalKey(this.$type, this.$model, this.$relatedModel())
        ),
      },
      relatedKey: {
        model: this.$relatedModel(),
        key: (
          this.manyToManyOptions.relatedKey ||
          this.$model.$configurator.getLocalKey(this.$type, this.$model, this.$relatedModel())
        ),
      },
    })

    this.$pivotTable = this.manyToManyOptions.pivotTable || this.$model.$configurator.getPivotTableName(
      this.$type,
      this.$model,
      this.$relatedModel(),
      this.$relationName,
    )

    /**
     * Keys on the parent model
     */
    this.$localKey = localKey.attributeName
    this.$localCastAsKey = localKey.castAsKey

    /**
     * Keys on the related model
     */
    this.$relatedKey = relatedKey.attributeName
    this.$relatedCastAsKey = relatedKey.castAsKey

    /**
     * Parent model foreign key in the pivot table
     */
    this.$pivotForeignKey = this.manyToManyOptions.pivotForeignKey ||
      this.$model.$configurator.getPivotForeignKey(
        this.$type, this.$model, this.$relatedModel(), this.$relationName
      )

    /**
     * Related model foreign key in the pivot table
     */
    this.$pivotRelatedForeignKey = this.manyToManyOptions.pivotRelatedForeignKey ||
      this.$model.$configurator.getPivotForeignKey(
        this.$type, this.$relatedModel(), this.$model, this.$relationName
      )

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
    const pivotForeignKeyAlias = this.pivotAlias(this.$pivotForeignKey)

    parent.forEach((parentModel) => {
      this.$setRelated(
        parentModel,
        related.filter((relatedModel) => {
          const value = parentModel[this.$localKey]
          return value !== undefined && relatedModel.$extras[pivotForeignKeyAlias] === value
        }),
      )
    })
  }

  public client (models: ModelContract | ModelContract[], client: QueryClientContract): any {
    this.$ensureIsBooted()
    return new ManyToManyQueryClient(models, client, this)
  }
}
