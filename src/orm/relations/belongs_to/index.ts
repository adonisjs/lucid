/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from '../../../../adonis-typings/database.js'
import { OneOrMany } from '../../../../adonis-typings/querybuilder.js'

import { LucidRow, LucidModel, ModelObject } from '../../../../adonis-typings/model.js'
import {
  RelationOptions,
  BelongsToRelationContract,
  BelongsTo as ModelBelongsTo,
} from '../../../../adonis-typings/relations.js'

import { KeysExtractor } from '../keys_extractor.js'
import { BelongsToQueryClient } from './query_client.js'
import { ensureRelationIsBooted, getValue } from '../../../utils/index.js'

/**
 * Manages loading and persisting belongs to relationship
 */
export class BelongsTo implements BelongsToRelationContract<LucidModel, LucidModel> {
  /**
   * Relationship name
   */
  readonly type = 'belongsTo'

  /**
   * Whether or not the relationship instance has been booted
   */
  booted: boolean = false

  /**
   * The key name for serializing the relationship
   */
  serializeAs: string | null

  /**
   * Local key is reference to the primary key in the related table
   * @note: Available after boot is invoked
   */
  declare localKey: string
  declare localKeyColumName: string

  /**
   * Foreign key is reference to the foreign key in the self table
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
    private options: RelationOptions<LucidModel, LucidModel, ModelBelongsTo<LucidModel>>,
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
    return new BelongsTo(this.relationName, this.relatedModel, { ...this.options }, parent)
  }

  /**
   * Returns a boolean telling if the related row belongs to the parent
   * row or not.
   */
  private isRelatedRow(parent: LucidRow, related: LucidRow) {
    return (
      (related as any)[this.localKey] !== undefined &&
      (parent as any)[this.foreignKey] === (related as any)[this.localKey]
    )
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
        model: relatedModel,
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
        model: this.model,
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
     * Keys on the related model
     */
    this.localKey = localKey.attributeName
    this.localKeyColumName = localKey.columnName

    /**
     * Keys on the parent model
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

    parent.$setRelated(this.relationName, related)
  }

  /**
   * Push related model instance
   */
  pushRelated(parent: LucidRow, related: LucidRow | null): void {
    ensureRelationIsBooted(this)
    if (related === undefined) {
      return
    }

    parent.$setRelated(this.relationName, related)
  }

  /**
   * Finds and set the related model instance next to the parent
   * models.
   */
  setRelatedForMany(parent: LucidRow[], related: LucidRow[]): void {
    ensureRelationIsBooted(this)

    parent.forEach((parentRow) => {
      const match = related.find((relatedRow) => this.isRelatedRow(parentRow, relatedRow))
      this.setRelated(parentRow, match || null)
    })
  }

  /**
   * Returns an instance of query client for the given relationship
   */
  client(parent: LucidRow, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return new BelongsToQueryClient(this, parent, client)
  }

  /**
   * Returns instance of the eager query for the relationship
   */
  eagerQuery(parent: OneOrMany<LucidRow>, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return BelongsToQueryClient.eagerQuery(client, this, parent)
  }

  /**
   * Returns instance of query builder
   */
  subQuery(
    client: QueryClientContract
  ): ReturnType<BelongsToRelationContract<LucidModel, LucidModel>['subQuery']> {
    ensureRelationIsBooted(this)
    return BelongsToQueryClient.subQuery(client, this) as unknown as ReturnType<
      BelongsToRelationContract<LucidModel, LucidModel>['subQuery']
    >
  }

  /**
   * Hydrates values object for persistance.
   */
  hydrateForPersistance(parent: LucidRow, related: ModelObject | LucidRow) {
    ;(parent as any)[this.foreignKey] = getValue(related, this.localKey, this, 'associate')
  }
}
