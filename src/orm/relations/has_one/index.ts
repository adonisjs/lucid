/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { OneOrMany } from '../../../../adonis-typings/querybuilder.js'
import { QueryClientContract } from '../../../../adonis-typings/database.js'
import { LucidRow, LucidModel, ModelObject } from '../../../../adonis-typings/model.js'
import {
  RelationOptions,
  HasOne as ModelHasOne,
  HasOneRelationContract,
} from '../../../../adonis-typings/relations.js'

import { KeysExtractor } from '../keys_extractor.js'
import { HasOneQueryClient } from './query_client.js'
import { ensureRelationIsBooted, getValue } from '../../../utils/index.js'

/**
 * Manages loading and persisting has one relationship
 */
export class HasOne implements HasOneRelationContract<LucidModel, LucidModel> {
  readonly type = 'hasOne'

  booted: boolean = false
  serializeAs

  /**
   * Local key is reference to the primary key in the self table
   * @note: Available after boot is invoked
   */
  declare localKey: string
  declare localKeyColumName: string

  /**
   * Foreign key is reference to the foreign key in the related table
   * @note: Available after boot is invoked
   */
  declare foreignKey: string
  declare foreignKeyColumName: string

  /**
   * Reference to the onQuery hook defined by the user
   */
  onQueryHook

  constructor(
    public relationName: string,
    public relatedModel: () => LucidModel,
    private options: RelationOptions<LucidModel, LucidModel, ModelHasOne<LucidModel>>,
    public model: LucidModel
  ) {
    this.onQueryHook = this.options.onQuery
    this.serializeAs =
      this.options.serializeAs === undefined ? this.relationName : this.options.serializeAs
  }

  /**
   * Clone relationship instance
   */
  clone(parent: LucidModel): any {
    return new HasOne(this.relationName, this.relatedModel, { ...this.options }, parent)
  }

  /**
   * Boot the relationship and ensure that all keys are in
   * place for queries to do their job.
   */
  boot() {
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
  setRelated(parent: LucidRow, related: LucidRow | null): void {
    ensureRelationIsBooted(this)
    if (related === undefined) {
      return
    }

    parent.$setRelated(this.relationName as any, related)
  }

  /**
   * Push related model instance
   */
  pushRelated(parent: LucidRow, related: LucidRow | null): void {
    ensureRelationIsBooted(this)

    if (related === undefined) {
      return
    }

    parent.$pushRelated(this.relationName as any, related)
  }

  /**
   * Finds and set the related model instance next to the parent
   * models.
   */
  setRelatedForMany(parent: LucidRow[], related: LucidRow[]): void {
    ensureRelationIsBooted(this)

    parent.forEach((parentModel) => {
      const match = related.find((relatedModel) => {
        const value = (parentModel as any)[this.localKey]
        return value !== undefined && value === (relatedModel as any)[this.foreignKey]
      })

      this.setRelated(parentModel, match || null)
    })
  }

  /**
   * Returns an instance of query client for invoking queries
   */
  client(parent: LucidRow, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return new HasOneQueryClient(this, parent, client)
  }

  /**
   * Returns eager query instance
   */
  eagerQuery(parent: OneOrMany<LucidRow>, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return HasOneQueryClient.eagerQuery(client, this, parent)
  }

  /**
   * Returns instance of query builder
   */
  subQuery(client: QueryClientContract) {
    ensureRelationIsBooted(this)
    return HasOneQueryClient.subQuery(client, this)
  }

  /**
   * Hydrates values object for persistance.
   */
  hydrateForPersistance(parent: LucidRow, values: ModelObject | LucidRow) {
    ;(values as any)[this.foreignKey] = getValue(parent, this.localKey, this, 'persist')
  }
}
