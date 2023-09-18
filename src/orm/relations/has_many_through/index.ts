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
import { LucidRow, LucidModel } from '../../../../adonis-typings/model.js'
import {
  ThroughRelationOptions,
  HasManyThroughRelationContract,
  HasManyThrough as ModelHasManyThrough,
} from '../../../../adonis-typings/relations.js'

import { KeysExtractor } from '../keys_extractor.js'
import { HasManyThroughClient } from './query_client.js'
import { ensureRelationIsBooted } from '../../../utils/index.js'

/**
 * Manages loading and persisting has many through relationship
 */
export class HasManyThrough implements HasManyThroughRelationContract<LucidModel, LucidModel> {
  type = 'hasManyThrough' as const

  booted: boolean = false
  serializeAs
  throughModel

  /**
   * Reference to the onQuery hook defined by the user
   */
  onQueryHook

  /**
   * Available after boot is invoked
   */
  declare localKey: string
  declare localKeyColumnName: string

  /**
   * This exists on the through model
   */
  declare foreignKey: string
  declare foreignKeyColumnName: string

  /**
   * This exists on the through model
   */
  declare throughLocalKey: string
  declare throughLocalKeyColumnName: string

  /**
   * This exists on the related model
   */
  declare throughForeignKey: string
  declare throughForeignKeyColumnName: string

  constructor(
    public relationName: string,
    public relatedModel: () => LucidModel,
    private options: ThroughRelationOptions<
      LucidModel,
      LucidModel,
      ModelHasManyThrough<LucidModel>
    > & {
      throughModel: () => LucidModel
    },
    public model: LucidModel
  ) {
    this.onQueryHook = this.options.onQuery
    this.throughModel = this.options.throughModel
    this.serializeAs =
      this.options.serializeAs === undefined ? this.relationName : this.options.serializeAs
  }

  /**
   * Clone relationship instance
   */
  clone(parent: LucidModel): any {
    return new HasManyThrough(this.relationName, this.relatedModel, { ...this.options }, parent)
  }

  /**
   * Returns the alias for the through key
   */
  throughAlias(key: string): string {
    return `through_${key}`
  }

  /**
   * Boot the relationship and ensure that all keys are in
   * place for queries to do their job.
   */
  boot() {
    if (this.booted) {
      return
    }

    /**
     * Extracting keys from the model and the relation model. The keys
     * extractor ensures all the required columns are defined on
     * the models for the relationship to work
     */
    const { localKey, foreignKey, throughLocalKey, throughForeignKey } = new KeysExtractor(
      this.model,
      this.relationName,
      {
        localKey: {
          model: this.model,
          key:
            this.options.localKey ||
            this.model.namingStrategy.relationLocalKey(
              this.type,
              this.model,
              this.relatedModel(),
              this.relationName
            ),
        },
        foreignKey: {
          model: this.throughModel(),
          key:
            this.options.foreignKey ||
            this.model.namingStrategy.relationForeignKey(
              this.type,
              this.model,
              this.throughModel(),
              this.relationName
            ),
        },
        throughLocalKey: {
          model: this.throughModel(),
          key:
            this.options.throughLocalKey ||
            this.model.namingStrategy.relationLocalKey(
              this.type,
              this.throughModel(),
              this.relatedModel(),
              this.relationName
            ),
        },
        throughForeignKey: {
          model: this.relatedModel(),
          key:
            this.options.throughForeignKey ||
            this.model.namingStrategy.relationForeignKey(
              this.type,
              this.throughModel(),
              this.relatedModel(),
              this.relationName
            ),
        },
      }
    ).extract()

    /**
     * Keys on the parent model
     */
    this.localKey = localKey.attributeName
    this.localKeyColumnName = localKey.columnName

    /**
     * Keys on the through model
     */
    this.foreignKey = foreignKey.attributeName
    this.foreignKeyColumnName = foreignKey.columnName

    this.throughLocalKey = throughLocalKey.attributeName
    this.throughLocalKeyColumnName = throughLocalKey.columnName

    this.throughForeignKey = throughForeignKey.attributeName
    this.throughForeignKeyColumnName = throughForeignKey.columnName

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
    const $foreignCastAsKeyAlias = this.throughAlias(this.foreignKeyColumnName)

    parent.forEach((parentModel) => {
      this.setRelated(
        parentModel,
        related.filter((relatedModel) => {
          const value = (parentModel as any)[this.localKey]
          return value !== undefined && relatedModel.$extras[$foreignCastAsKeyAlias] === value
        })
      )
    })
  }

  /**
   * Returns an instance of query client for invoking queries
   */
  client(parent: LucidRow, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return new HasManyThroughClient(this, parent, client)
  }

  /**
   * Returns instance of the eager query
   */
  eagerQuery(parent: OneOrMany<LucidRow>, client: QueryClientContract) {
    ensureRelationIsBooted(this)
    return HasManyThroughClient.eagerQuery(client, this, parent)
  }

  /**
   * Returns instance of query builder
   */
  subQuery(client: QueryClientContract) {
    ensureRelationIsBooted(this)
    return HasManyThroughClient.subQuery(client, this)
  }
}
