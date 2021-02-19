/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { OneOrMany } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { LucidRow, LucidModel, ModelObject } from '@ioc:Adonis/Lucid/Model'

import {
  RelationOptions,
  HasOne as ModelHasOne,
  HasOneRelationContract,
} from '@ioc:Adonis/Lucid/Relations'

import { KeysExtractor } from '../KeysExtractor'
import { HasOneQueryClient } from './QueryClient'
import { ensureRelationIsBooted, getValue } from '../../../utils'

/**
 * Manages loading and persisting has one relationship
 */
export class HasOne implements HasOneRelationContract<LucidModel, LucidModel> {
  public readonly type = 'hasOne'

  public booted: boolean = false

  public serializeAs =
    this.options.serializeAs === undefined ? this.relationName : this.options.serializeAs

  /**
   * Local key is reference to the primary key in the self table
   * @note: Available after boot is invoked
   */
  public localKey: string
  public localKeyColumName: string

  /**
   * Foreign key is reference to the foreign key in the related table
   * @note: Available after boot is invoked
   */
  public foreignKey: string
  public foreignKeyColumName: string

  /**
   * Reference to the onQuery hook defined by the user
   */
  public onQueryHook = this.options.onQuery

  constructor(
    public relationName: string,
    public relatedModel: () => LucidModel,
    private options: RelationOptions<ModelHasOne<LucidModel>>,
    public model: LucidModel
  ) {}

  /**
   * Boot the relationship and ensure that all keys are in
   * place for queries to do their job.
   */
  public boot() {
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
        key:
          this.options.localKey ||
          this.model.namingStrategy.relationLocalKey(
            this.type,
            this.model,
            relatedModel,
            this.relationName
          ),
      },
      foreignKey: {
        model: relatedModel,
        key:
          this.options.foreignKey ||
          this.model.namingStrategy.relationForeignKey(
            this.type,
            this.model,
            relatedModel,
            this.relationName
          ),
      },
    }).extract()

    /**
     * Keys on the parent model
     */
    this.localKey = localKey.attributeName
    this.localKeyColumName = localKey.columnName

    /**
     * Keys on the related model
     */
    this.foreignKey = foreignKey.attributeName
    this.foreignKeyColumName = foreignKey.columnName

    /**
     * Booted successfully
     */
    this.booted = true
  }

  /**
   * Set related model instance
   */
  public setRelated(parent: LucidRow, related: LucidRow | null): void {
    ensureRelationIsBooted(this)
    if (!related) {
      return
    }

    parent.$setRelated(this.relationName as any, related)
  }

  /**
   * Push related model instance
   */
  public pushRelated(parent: LucidRow, related: LucidRow | null): void {
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
  public setRelatedForMany(parent: LucidRow[], related: LucidRow[]): void {
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
        this.setRelated(match, relatedModel)
      }
    })
  }

  /**
   * Returns an instance of query client for invoking queries
   */
  public client(parent: LucidRow, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return new HasOneQueryClient(this, parent, client)
  }

  /**
   * Returns eager query instance
   */
  public eagerQuery(parent: OneOrMany<LucidRow>, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return HasOneQueryClient.eagerQuery(client, this, parent)
  }

  /**
   * Returns instance of query builder
   */
  public subQuery(client: QueryClientContract) {
    ensureRelationIsBooted(this)
    return HasOneQueryClient.subQuery(client, this)
  }

  /**
   * Hydrates values object for persistance.
   */
  public hydrateForPersistance(parent: LucidRow, values: ModelObject | LucidRow) {
    values[this.foreignKey] = getValue(parent, this.localKey, this, 'persist')
  }
}
