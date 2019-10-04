/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { camelCase, snakeCase, uniq } from 'lodash'

import {
  ModelContract,
  RelationContract,
  ThroughRelationNode,
  ModelConstructorContract,
  ModelQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { HasManyThroughQueryBuilder } from './QueryBuilder'

export class HasManyThrough implements RelationContract {
  /**
   * Relationship type
   */
  public type: 'hasManyThrough'

  /**
   * The related model from which, we want to construct the relationship
   */
  public relatedModel = this._options.relatedModel!

  /**
   * The through model from which, we construct the through query
   */
  public throughModel = this._options.throughModel

  /**
   * Local key on the parent model for constructing relationship
   */
  public localKey: string

  /**
   * Adapter key for the defined `localKey`
   */
  public localAdapterKey: string

  /**
   * Foreign key on the through model. NOTE: We do not have any direct
   * relationship with the related model and hence our FK is on
   * the through model
   */
  public foreignKey: string

  /**
   * Adapter key for the defined `foreignKey`
   */
  public foreignAdapterKey: string

  /**
   * The local (PK) on the through model.
   */
  public throughLocalKey: string

  /**
   * Adapter key for the defined `throughLocalKey`
   */
  public throughLocalAdapterKey: string

  /**
   * Foreign key on the `relatedModel`. This bounds the `throughModel` with
   * the `relatedModel`.
   */
  public throughForeignKey: string

  /**
   * Adapter key for the defined `throughForeignKey`
   */
  public throughForeignAdapterKey: string

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
    private _options: ThroughRelationNode,
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
   * Validating the keys to ensure we are avoiding runtime `undefined` errors. We defer
   * the keys validation, since they may be added after defining the relationship.
   */
  private _validateKeys () {
    const relationRef = `${this._model.name}.${this._relationName}`

    if (!this._model.$hasColumn(this.localKey)) {
      const ref = `${this._model.name}.${this.localKey}`
      throw new Exception(
        `${ref} required by ${relationRef} relation is missing`,
        500,
        'E_MISSING_RELATED_LOCAL_KEY',
      )
    }

    if (!this.throughModel().$hasColumn(this.foreignKey)) {
      const ref = `${this.throughModel().name}.${this.foreignKey}`
      throw new Exception(
        `${ref} required by ${relationRef} relation is missing`,
        500,
        'E_MISSING_RELATED_FOREIGN_KEY',
      )
    }

    if (!this.throughModel().$hasColumn(this.throughLocalKey)) {
      const ref = `${this.throughModel().name}.${this.throughLocalKey}`
      throw new Exception(
        `${ref} required by ${relationRef} relation is missing`,
        500,
        'E_MISSING_THROUGH_LOCAL_KEY',
      )
    }

    if (!this.relatedModel().$hasColumn(this.throughForeignKey)) {
      const ref = `${this.relatedModel().name}.${this.throughForeignKey}`
      throw new Exception(
        `${ref} required by ${relationRef} relation is missing`,
        500,
        'E_MISSING_THROUGH_FOREIGN_KEY',
      )
    }
  }

  /**
   * Raises exception when value for the local key is missing on the model instance. This will
   * make the query fail
   */
  private _ensureValue (value: any) {
    if (value === undefined) {
      throw new Exception(
        `Cannot preload ${this._relationName}, value of ${this._model.name}.${this.localKey} is undefined`,
        500,
      )
    }

    return value
  }

  /**
   * Adds the select columns
   */
  private _addSelect (query: ModelQueryBuilderContract<any>) {
    query.select(
      `${this.relatedModel().$table}.*`,
      `${this.throughModel().$table}.${this.foreignAdapterKey} as through_${this.foreignAdapterKey}`,
    )
  }

  /**
   * Adds the join clause for the select query
   */
  private _addJoin (query: ModelQueryBuilderContract<any>) {
    const throughTable = this.throughModel().$table
    const relatedTable = this.relatedModel().$table

    query.innerJoin(
      `${throughTable}`,
      `${throughTable}.${this.throughLocalAdapterKey}`,
      `${relatedTable}.${this.throughForeignAdapterKey}`,
    )
  }

  /**
   * Returns the belongs to query builder
   */
  private _getQueryBuilder (client: QueryClientContract) {
    return new HasManyThroughQueryBuilder(client.knexQuery(), this, client)
  }

  /**
   * Compute keys
   */
  public boot () {
    if (this.booted) {
      return
    }

    this.localKey = this._options.localKey || this._model.$primaryKey
    this.foreignKey = this._options.foreignKey || camelCase(`${this._model.name}_${this._model.$primaryKey}`)

    this.throughLocalKey = this._options.localKey || this.throughModel().$primaryKey // id (user)
    this.throughForeignKey = this._options.throughForeignKey
      || camelCase(`${this.throughModel().name}_${this.throughModel().$primaryKey}`) // user_id (user)

    /**
     * Validate computed keys to ensure they are valid
     */
    this._validateKeys()

    /**
     * Keys for the adapter
     */
    this.localAdapterKey = this._model.$getColumn(this.localKey)!.castAs
    this.foreignAdapterKey = this.throughModel().$getColumn(this.foreignKey)!.castAs
    this.throughLocalAdapterKey = this.throughModel().$getColumn(this.throughLocalKey)!.castAs
    this.throughForeignAdapterKey = this.relatedModel().$getColumn(this.throughForeignKey)!.castAs
    this.booted = true
  }

  /**
   * Returns query for the relationship with applied constraints for
   * eagerloading
   */
  public getEagerQuery (parents: ModelContract[], client: QueryClientContract): any {
    const values = uniq(parents.map((parentInstance) => {
      return this._ensureValue(parentInstance[this.localKey])
    }))

    const throughTable = this.throughModel().$table
    const query = this._getQueryBuilder(client)

    this._addJoin(query)
    this._addSelect(query)

    return query.whereIn(`${throughTable}.${this.foreignAdapterKey}`, values)
  }

  /**
   * Returns query for the relationship with applied constraints
   */
  public getQuery (parent: ModelContract, client: QueryClientContract): any {
    const value = parent[this.localKey]
    const throughTable = this.throughModel().$table
    const query = this._getQueryBuilder(client)

    this._addJoin(query)
    this._addSelect(query)

    return query.where(`${throughTable}.${this.foreignAdapterKey}`, this._ensureValue(value))
  }

  /**
   * Sets the related model instance
   */
  public setRelated (parent: ModelContract, related?: ModelContract[]) {
    if (!related) {
      return
    }

    parent.$setRelated(this._relationName as keyof typeof parent, related)
  }

  /**
   * Set many related instances
   */
  public setRelatedMany (parents: ModelContract[], related: ModelContract[]) {
    parents.forEach((parent) => {
      const relation = related.filter((model) => {
        return model.$extras[`through_${this.foreignAdapterKey}`] === parent[this.localKey]
      })
      this.setRelated(parent, relation)
    })
  }
}
