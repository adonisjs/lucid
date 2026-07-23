/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type OneOrMany } from '../../../types/querybuilder.js'
import { type QueryClientContract } from '../../../types/database.js'

import { type LucidRow, type LucidModel, type ModelObject } from '../../../types/model.js'

import {
  type RelationOptions,
  type HasManyRelationContract,
  type HasMany as ModelHasMany,
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

  declare meta?: any

  constructor(
    public relationName: string,
    public relatedModel: () => LucidModel,
    private options: RelationOptions<LucidModel, LucidModel, ModelHasMany<LucidModel>>,
    public model: LucidModel
  ) {
    this.serializeAs =
      this.options.serializeAs === undefined ? this.relationName : this.options.serializeAs
    this.onQueryHook = this.options.onQuery
    this.meta = this.options.meta
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
    relatedModel.boot()

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

    /**
     * Group the related rows by their foreign key in a single pass, so matching
     * each parent is an O(1) lookup instead of re-filtering the entire related
     * array per parent (which is O(parents × related)).
     */
    const relatedByForeignKey = new Map<any, LucidRow[]>()
    for (const relatedModel of related) {
      const key = (relatedModel as any)[this.foreignKey]
      const bucket = relatedByForeignKey.get(key)
      if (bucket) {
        bucket.push(relatedModel)
      } else {
        relatedByForeignKey.set(key, [relatedModel])
      }
    }

    parent.forEach((parentModel) => {
      const value = (parentModel as any)[this.localKey]
      this.setRelated(
        parentModel,
        value !== undefined ? (relatedByForeignKey.get(value) ?? []) : []
      )
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
