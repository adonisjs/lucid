/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { camelCase, snakeCase, uniq } from 'lodash'

import {
  ModelContract,
  BaseRelationNode,
  BaseRelationContract,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

/**
 * Exposes the API to construct belongs to relationship.
 */
export class BelongsTo implements BaseRelationContract {
  /**
   * Relationship type
   */
  public type = 'belongsTo' as const

  /**
   * The related model from which, we want to construct the relationship
   */
  public relatedModel = this._options.relatedModel!

  /**
   * Local key to use for constructing the relationship. This is the primary
   * key on the related model
   */
  public localKey: string

  /**
   * Adapter local key.
   */
  public localAdapterKey: string

  /**
   * Foreign key is the on the current model.
   */
  public foreignKey: string

  /**
   * Adapter foreign key
   */
  public foreignAdapterKey: string

  /**
   * Key to be used for serializing the relationship
   */
  public serializeAs = this._options.serializeAs || snakeCase(this._relationName)

  /**
   * A flag to know if model keys valid for executing database queries or not
   */
  public booted: boolean = false

  constructor (
    private _relationName: string,
    private _options: BaseRelationNode,
    private _model: ModelConstructorContract,
  ) {
    this._ensureRelatedModel()
  }

  /**
   * Ensure that related model is defined, otherwise raise an exception, since
   * a relationship cannot work with a single model.
   */
  private _ensureRelatedModel () {
    if (!this._options.relatedModel) {
      throw new Exception(
        'Related model reference is required to construct the relationship',
        500,
        'E_MISSING_RELATED_MODEL',
      )
    }
  }

  /**
   * Compute keys
   */
  public boot () {
    if (this.booted) {
      return
    }

    this.localKey = this._options.localKey || this.relatedModel().$primaryKey
    this.foreignKey = this._options.foreignKey || camelCase(
      `${this.relatedModel().name}_${this.relatedModel().$primaryKey}`,
    )

    /**
     * Validate computed keys to ensure they are valid
     */
    this._validateKeys()

    /**
     * Keys for the adapter
     */
    this.localAdapterKey = this.relatedModel().$getColumn(this.localKey)!.castAs
    this.foreignAdapterKey = this._model.$getColumn(this.foreignKey)!.castAs
    this.booted = true
  }

  /**
   * Validating the keys to ensure we are avoiding runtime `undefined` errors. We defer
   * the keys validation, since they may be added after defining the relationship.
   */
  private _validateKeys () {
    const relationRef = `${this._model.name}.${this._relationName}`

    if (!this._model.$hasColumn(this.foreignKey)) {
      const ref = `${this._model.name}.${this.foreignKey}`
      throw new Exception(
        `${ref} required by ${relationRef} relation is missing`,
        500,
        'E_MISSING_RELATED_LOCAL_KEY',
      )
    }

    if (!this.relatedModel().$hasColumn(this.localKey)) {
      const ref = `${this.relatedModel().name}.${this.localKey}`
      throw new Exception(
        `${ref} required by ${relationRef} relation is missing`,
        500,
        'E_MISSING_RELATED_FOREIGN_KEY',
      )
    }
  }

  /**
   * Raises exception when value for the foreign key is missing on the model instance. This will
   * make the query fail
   */
  private _ensureValue (value: any) {
    if (value === undefined) {
      throw new Exception(
        `Cannot preload ${this._relationName}, value of ${this._model.name}.${this.foreignKey} is undefined`,
        500,
      )
    }

    return value
  }

  /**
   * Returns eager query for a single parent model instance
   */
  public getQuery (parent: ModelContract, client: QueryClientContract) {
    const value = parent[this.foreignKey]

    return this.relatedModel()
      .query({ client })
      .where(this.localAdapterKey, this._ensureValue(value))
      .limit(1)
  }

  /**
   * Returns query for the relationship with applied constraints for
   * eagerloading
   */
  public getEagerQuery (parents: ModelContract[], client: QueryClientContract) {
    const values = uniq(parents.map((parentInstance) => {
      return this._ensureValue(parentInstance[this.localKey])
    }))

    return this.relatedModel()
      .query({ client })
      .whereIn(this.localAdapterKey, values)
  }

  /**
   * Sets the related model instance
   */
  public setRelated (model: ModelContract, related?: ModelContract) {
    if (!related) {
      return
    }

    model.$setRelated(this._relationName as keyof typeof model, related)
  }

  /**
   * Sets the related instances on the model
   */
  public setRelatedMany (parents: ModelContract[], related: ModelContract[]) {
    parents.forEach((parent) => {
      const relation = related.find((model) => model[this.localKey] === parent[this.foreignKey])
      if (relation) {
        this.setRelated(parent, relation)
      }
    })
  }
}
