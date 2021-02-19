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
import { LucidModel, LucidRow, ModelObject } from '@ioc:Adonis/Lucid/Model'

import {
  RelationOptions,
  HasManyRelationContract,
  HasMany as ModelHasMany,
} from '@ioc:Adonis/Lucid/Relations'

import { KeysExtractor } from '../KeysExtractor'
import { HasManyQueryClient } from './QueryClient'
import { ensureRelationIsBooted, getValue } from '../../../utils'

/**
 * Manages persisting and fetching relationships
 */
export class HasMany implements HasManyRelationContract<LucidModel, LucidModel> {
  /**
   * The relationship name
   */
  public readonly type = 'hasMany'

  /**
   * Whether or not the relationship instance has been
   * booted
   */
  public booted: boolean = false

  /**
   * The key name for serializing the relationship
   */
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
    private options: RelationOptions<ModelHasMany<LucidModel>>,
    public model: LucidModel
  ) {}

  /**
   * Returns a boolean saving related row belongs to the parent
   * row or not.
   */
  private isRelatedRow(parent: LucidRow, related: LucidRow) {
    return parent[this.localKey] !== undefined && related[this.foreignKey] === parent[this.localKey]
  }

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
   * Set related model instances
   */
  public setRelated(parent: LucidRow, related: LucidRow[]): void {
    ensureRelationIsBooted(this)

    related.forEach((relatedRow) => {
      if (!this.isRelatedRow(parent, relatedRow)) {
        throw new Error('malformed setRelated call')
      }
    })

    parent.$setRelated(this.relationName, related)
  }

  /**
   * Push related model instance(s)
   */
  public pushRelated(parent: LucidRow, related: LucidRow | LucidRow[]): void {
    ensureRelationIsBooted(this)

    if (Array.isArray(related)) {
      related.forEach((relatedRow) => {
        if (!this.isRelatedRow(parent, relatedRow)) {
          throw new Error('malformed pushRelated call')
        }
      })
    } else {
      if (!this.isRelatedRow(parent, related)) {
        throw new Error('malformed pushRelated call')
      }
    }

    parent.$pushRelated(this.relationName, related)
  }

  /**
   * Finds and set the related model instances next to the parent
   * models.
   */
  public setRelatedForMany(parent: LucidRow[], related: LucidRow[]): void {
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
  public client(parent: LucidRow, client: QueryClientContract): any {
    ensureRelationIsBooted(this)
    return new HasManyQueryClient(this, parent, client)
  }

  /**
   * Returns an instance of the eager query
   */
  public eagerQuery(parent: OneOrMany<LucidRow>, client: QueryClientContract) {
    ensureRelationIsBooted(this)
    return HasManyQueryClient.eagerQuery(client, this, parent)
  }

  /**
   * Returns instance of query builder
   */
  public subQuery(client: QueryClientContract) {
    ensureRelationIsBooted(this)
    return HasManyQueryClient.subQuery(client, this)
  }

  /**
   * Hydrates values object for persistance.
   */
  public hydrateForPersistance(parent: LucidRow, values: ModelObject | LucidRow) {
    values[this.foreignKey] = getValue(parent, this.localKey, this, 'persist')
  }
}
