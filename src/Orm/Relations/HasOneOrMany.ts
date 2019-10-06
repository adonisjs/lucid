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
import snakeCase from 'snake-case'
import camelCase from 'camelcase'

import {
  ModelContract,
  BaseRelationNode,
  RelationContract,
  ModelConstructorContract,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

export abstract class HasOneOrMany implements RelationContract {
  /**
   * Relationship type
   */
  public type: 'hasOne' | 'hasMany'

  /**
   * The related model from which, we want to construct the relationship
   */
  public relatedModel = this._options.relatedModel!

  /**
   * Local key to use for constructing the relationship
   */
  public localKey: string

  /**
   * Adapter local key
   */
  public localAdapterKey: string

  /**
   * Foreign key referenced by the related model
   */
  public foreignKey: string

  /**
   * Adapter foreign key
   */
  public foreignAdapterKey: string

  /**
   * Key to be used for serializing the relationship
   */
  public serializeAs = this._options.serializeAs || snakeCase(this.relationName)

  /**
   * A flag to know if model keys valid for executing database queries or not
   */
  public booted: boolean = false

  constructor (
    public relationName: string,
    private _options: BaseRelationNode,
    public model: ModelConstructorContract,
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
   * Validating the keys to ensure we are avoiding runtime `undefined` errors. We defer
   * the keys validation, since they may be added after defining the relationship.
   */
  private _validateKeys () {
    const relationRef = `${this.model.name}.${this.relationName}`

    if (!this.model.$hasColumn(this.localKey)) {
      const ref = `${this.model.name}.${this.localKey}`
      throw new Exception(
        `${ref} required by ${relationRef} relation is missing`,
        500,
        'E_MISSING_RELATED_LOCAL_KEY',
      )
    }

    if (!this.relatedModel().$hasColumn(this.foreignKey)) {
      const ref = `${this.relatedModel().name}.${this.foreignKey}`
      throw new Exception(
        `${ref} required by ${relationRef} relation is missing`,
        500,
        'E_MISSING_RELATED_FOREIGN_KEY',
      )
    }
  }

  /**
   * Must be implemented by main class
   */
  public abstract getQuery (parent: ModelContract, client: QueryClientContract)

  /**
   * Must be implemented by parent class
   */
  public abstract setRelatedMany (parent: ModelContract[], related: ModelContract[])

  /**
   * Must be implemented by parent class
   */
  protected abstract $getQueryBuilder (
    client: QueryClientContract,
    parent: ModelContract | ModelContract[],
  ): any

  /**
   * Compute keys
   */
  public boot () {
    if (this.booted) {
      return
    }

    this.localKey = this._options.localKey || this.model.$primaryKey
    this.foreignKey = this._options.foreignKey || camelCase(`${this.model.name}_${this.model.$primaryKey}`)

    /**
     * Validate computed keys to ensure they are valid
     */
    this._validateKeys()

    /**
     * Keys for the adapter
     */
    this.localAdapterKey = this.model.$getColumn(this.localKey)!.castAs
    this.foreignAdapterKey = this.relatedModel().$getColumn(this.foreignKey)!.castAs
    this.booted = true
  }

  /**
   * Returns query for the relationship with applied constraints for
   * eagerloading
   */
  public getEagerQuery (parents: ModelContract[], client: QueryClientContract) {
    return this.$getQueryBuilder(client, parents)
  }

  /**
   * Sets the related model instance
   */
  public setRelated (parent: ModelContract, related?: ModelContract | ModelContract[]) {
    if (!related) {
      return
    }

    parent.$setRelated(this.relationName as keyof typeof parent, related)
  }
}
