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
import { snakeCase, uniq, sortBy } from 'lodash'

import {
  ModelContract,
  RelationContract,
  ManyToManyRelationNode,
  ModelConstructorContract,
  ManyToManyQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ManyToManyQueryBuilder } from './QueryBuilder'

/**
 * Exposes the API to construct many to many relationship. This also comes
 * with it's own query builder
 */
export class ManyToMany implements RelationContract {
  /**
   * Relationship type
   */
  public type = 'manyToMany' as const

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
   * Primary key on the related model
   */
  public relatedKey: string

  /**
   * Primary adapter key on the related model
   */
  public relatedAdapterKey: string

  /**
   * Foreign key referenced on the pivot table by the current model.
   * It is the adapter key, since there is no model in play
   */
  public pivotForeignKey: string

  /**
   * Alias for the select column for `pivotForeignKey`
   */
  public pivotForeignKeyAlias: string

  /**
   * Foreign key referenced on the pivot table by the related model.
   * It is the adapter key, since there is no model in play
   */
  public pivotRelatedForeignKey: string

  /**
   * Alias for the select column for `pivotRelatedForeignKey`
   */
  public pivotRelatedForeignKeyAlias: string

  /**
   * Pivot table for joining relationships
   */
  public pivotTable: string

  /**
   * Key to be used for serializing the relationship
   */
  public serializeAs = this._options.serializeAs || snakeCase(this._relationName)

  /**
   * A flag to know if model keys are valid for executing database queries or not
   */
  public booted: boolean = false

  constructor (
    private _relationName: string,
    private _options: ManyToManyRelationNode,
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

    if (!this.relatedModel().$hasColumn(this.relatedKey)) {
      const ref = `${this.relatedModel().name}.${this.relatedKey}`
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
        `Cannot preload ${this._relationName}, value of ${this._model.name}.${this.localKey} is undefined`,
        500,
      )
    }

    return value
  }

  /**
   * Adds necessary select columns for the select query
   */
  private _addSelect (query: ManyToManyQueryBuilderContract<any>) {
    query.select(`${this.relatedModel().$table}.*`)
    query.pivotColumns(
      [this.pivotForeignKey, this.pivotRelatedForeignKey].concat(this._options.pivotColumns || []),
    )
  }

  /**
   * Adds neccessary joins for the select query
   */
  private _addJoin (query: ManyToManyQueryBuilderContract<any>) {
    query.innerJoin(
      this.pivotTable,
      `${this.relatedModel().$table}.${this.relatedAdapterKey}`,
      `${this.pivotTable}.${this.pivotRelatedForeignKey}`,
    )
  }

  /**
   * Returns the belongs to query builder
   */
  private _getQueryBuilder (client: QueryClientContract) {
    return new ManyToManyQueryBuilder(client.knexQuery(), this, client)
  }

  /**
   * Compute keys
   */
  public boot () {
    if (this.booted) {
      return
    }

    this.pivotTable = this._options.pivotTable || snakeCase(
      sortBy([this.relatedModel().name, this._model.name]).join('_'),
    )

    /**
     * Parent model and it's foreign key in pivot table
     */
    this.localKey = this._options.localKey || this._model.$primaryKey
    this.pivotForeignKey = this._options.pivotForeignKey || snakeCase(
      `${this._model.name}_${this._model.$primaryKey}`,
    )
    this.pivotForeignKeyAlias = `pivot_${this.pivotForeignKey}`

    /**
     * Related model and it's foreign key in pivot table
     */
    this.relatedKey = this._options.relatedKey || this.relatedModel().$primaryKey
    this.pivotRelatedForeignKey = this._options.pivotRelatedForeignKey || snakeCase(
      `${this.relatedModel().name}_${this.relatedModel().$primaryKey}`,
    )
    this.pivotRelatedForeignKeyAlias = `pivot_${this.pivotRelatedForeignKey}`

    /**
     * Validate computed keys to ensure they are valid
     */
    this._validateKeys()

    /**
     * Keys for the adapter
     */
    this.localAdapterKey = this._model.$getColumn(this.localKey)!.castAs
    this.relatedAdapterKey = this.relatedModel().$getColumn(this.relatedKey)!.castAs
    this.booted = true
  }

  /**
   * Must be implemented by main class
   */
  public getQuery (parent: ModelContract, client: QueryClientContract): any {
    const value = parent[this.localKey]

    const query = this._getQueryBuilder(client)
    this._addSelect(query)
    this._addJoin(query)

    return query.wherePivot(this.pivotForeignKey, value)
  }

  /**
   * Returns query for the relationship with applied constraints for
   * eagerloading
   */
  public getEagerQuery (parents: ModelContract[], client: QueryClientContract): any {
    const values = uniq(parents.map((parentInstance) => {
      return this._ensureValue(parentInstance[this.localKey])
    }))

    const query = this._getQueryBuilder(client)
    this._addSelect(query)
    this._addJoin(query)

    return query.whereInPivot(this.pivotForeignKey, values)
  }

  /**
   * Sets the related model instance
   */
  public setRelated (model: ModelContract, related?: ModelContract[] | null) {
    if (!related) {
      return
    }

    model.$setRelated(this._relationName as keyof typeof model, related)
  }

  /**
   * Must be implemented by parent class
   */
  public setRelatedMany (parents: ModelContract[], related: ModelContract[]) {
    parents.forEach((parent) => {
      const relation = related.filter((model) => {
        return parent[this.localKey] === model.$extras[this.pivotForeignKeyAlias]
      })
      this.setRelated(parent, relation)
    })
  }
}
