/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { OneOrMany } from '../../../types/querybuilder.js'
import { QueryClientContract } from '../../../types/database.js'

import { LucidRow, LucidModel, ModelObject } from '../../../types/model.js'

import {
  RelationOptions,
  HasManyRelationContract,
  HasMany as ModelHasMany,
} from '../../../types/relations.js'

import { KeysExtractor } from '../keys_extractor.js'
import { HasManyQueryClient } from './query_client.js'
import { ensureRelationIsBooted, getValue } from '../../../utils/index.js'

/**
 * Manages persisting and fetching relationships
 */
export class HasMany implements HasManyRelationContract<LucidModel, LucidModel> {
  /**
   * The relationship name
   */
  readonly type = 'hasMany'

  /**
   * Whether or not the relationship instance has been
   * booted
   */
  booted: boolean = false

  /**
   * The key name for serializing the relationship
   */
  serializeAs

  /**
   * Local key is reference to the primary key in the self table
   * @note: Available after boot is invoked
   */
  declare localKey: string
  declare localKeyColumnName: string

  /**
   * Foreign key is reference to the foreign key in the related table
   * @note: Available after boot is invoked
   */
  declare foreignKey: string
  declare foreignKeyColumnName: string

  /**
   * Reference to the onQuery hook defined by the user
   */
  onQueryHook

  constructor(
    public relationName: string,
    public relatedModel: () => LucidModel,
    private options: RelationOptions<LucidModel, LucidModel, ModelHasMany<LucidModel>>,
    public model: LucidModel
  ) {
    this.serializeAs =
      this.options.serializeAs === undefined ? this.relationName : this.options.serializeAs
    this.onQueryHook = this.options.onQuery
  }

  /**
   * Returns a boolean saving related row belongs to the parent
   * row or not.
   */
  private isRelatedRow(parent: LucidRow, related: LucidRow) {
    return (
      (parent as any)[this.localKey] !== undefined &&
      (related as any)[this.foreignKey] === (parent as any)[this.localKey]
    )
  }

  /**
   * Clone relationship instance
   */
  clone(parent: LucidModel): any {
    return new HasMany(this.relationName, this.relatedModel, { ...this.options }, parent)
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
    this.localKeyColumnName = localKey.columnName

    /**
     * Keys on the related model
     */
    this.foreignKey = foreignKey.attributeName
    this.foreignKeyColumnName = foreignKey.columnName

    /**
     * Booted successfully
     */
    this.booted = true
  }

  /**
   * Set related model instances
   */
  setRelated(parent: LucidRow, related: LucidRow[]): void {
    ensureRelationIsBooted(this)
    parent.$setRelated(this.relationName, related)
  }

  /**
   * Push related model instance(s)
   */
  pushRelated(parent: LucidRow, related: LucidRow | LucidRow[]): void {
    ensureRelationIsBooted(this)
    parent.$pushRelated(this.relationName, related)
  }

  /**
   * Finds and set the related model instances next to the parent
   * models.
   */
  setRelatedForMany(parent: LucidRow[], related: LucidRow[]): void {
    ensureRelationIsBooted(this)

    parent.forEach((parentModel) => {
      const relatedRows = related.filter((relatedModel) =>
        this.isRelatedRow(parentModel, relatedModel)
      )
      this.setRelated(parentModel, relatedRows)
    })
  }

  /**
   * Returns an instance of query client for invoking queries
   */
  client(parent: LucidRow, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return new HasManyQueryClient(this, parent, client)
  }

  /**
   * Returns an instance of the eager query
   */
  eagerQuery(parent: OneOrMany<LucidRow>, client: QueryClientContract) {
    ensureRelationIsBooted(this)
    return HasManyQueryClient.eagerQuery(client, this, parent)
  }

  /**
   * Returns instance of query builder
   */
  subQuery(client: QueryClientContract) {
    ensureRelationIsBooted(this)
    return HasManyQueryClient.subQuery(client, this)
  }

  /**
   * Hydrates values object for persistance.
   */
  hydrateForPersistance(parent: LucidRow, values: ModelObject | LucidRow) {
    ;(values as any)[this.foreignKey] = getValue(parent, this.localKey, this, 'persist')
  }
}
