/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import knex from 'knex'
import { trait } from '@poppinss/traits'
import { Exception } from '@poppinss/utils'

import {
  ModelOptions,
  ModelContract,
  PreloadCallback,
  RelationContract,
  ModelConstructorContract,
  ModelQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { Chainable } from '../../Database/QueryBuilder/Chainable'
import { Executable, ExecutableConstructor } from '../../Traits/Executable'

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
@trait<ExecutableConstructor>(Executable)
export class ModelQueryBuilder extends Chainable implements ModelQueryBuilderContract<ModelConstructorContract
> {
  /**
   * Sideloaded attributes that will be passed to the model instances
   */
  private _sideloaded = {}

  /**
   * A copy of defined preloads on the model instance
   */
  private _preloads: {
    [name: string]: {
      relation: RelationContract,
      callback?: PreloadCallback,
      children: { relationName: string, callback?: PreloadCallback }[],
    },
  } = {}

  constructor (
    builder: knex.QueryBuilder,
    public model: ModelConstructorContract,
    public client: QueryClientContract,
    public options?: ModelOptions,
  ) {
    super(builder, (userFn) => {
      return (builder) => {
        userFn(new ModelQueryBuilder(builder, this.model, this.client, this.options))
      }
    })
    builder.table(model.$table)
  }

  /**
  * Parses the relation name string for nested relations. Nested relations
  * can be defined using the dot notation.
  */
  private _parseRelationName (relationName: string, callback?: PreloadCallback) {
    const relations = relationName.split('.')
    const primary = relations.shift()!
    const relation = this.model.$getRelation(primary)

    /**
     * Undefined relationship
     */
    if (!relation) {
      throw new Exception(`${primary} is not defined as a relationship on ${this.model.name} model`)
    }

    return {
      primary,
      relation,
      children: relations.length ? { relationName: relations.join(''), callback } : null,
      callback: relations.length ? null : callback,
    }
  }

  /**
   * Process preloaded relationship
   */
  private async _processRelation (models: ModelContract[], name: string) {
    const relation = this._preloads[name]
    const query = relation.relation.getEagerQuery(models, this.options)

    /**
     * Pass nested preloads
     */
    relation.children.forEach(({ relationName, callback }) => query.preload(relationName, callback))

    /**
     * Invoke callback when defined
     */
    if (typeof (relation.callback) === 'function') {
      relation.callback(query)
    }

    /**
     * Execute query
     */
    const result = await query.exec()

    /**
     * Set relationships on models
     */
    relation.relation.setRelatedMany(models, result)
  }

  /**
   * Wraps the query result to model instances. This method is invoked by the
   * Executable trait.
   */
  public async afterExecute (rows: any[]): Promise<any[]> {
    const modelInstances = this.model.$createMultipleFromAdapterResult(
      rows,
      this._sideloaded,
      this.options,
    )

    await Promise.all(Object.keys(this._preloads).map((name) => {
      return this._processRelation(modelInstances, name)
    }))

    return modelInstances
  }

  /**
   * Set sideloaded properties to be passed to the model instance
   */
  public sideload (value: any) {
    this._sideloaded = value
    return this
  }

  /**
   * Returns the connection name used by the query client
   */
  public get connection () {
    return this.client!.connectionName
  }

  /**
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  public async first (): Promise<any> {
    const result = await this.limit(1)['exec']()
    return result[0] || null
  }

  /**
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  public async firstOrFail (): Promise<any> {
    const result = await this.limit(1)['exec']()
    if (!result.length) {
      throw new Error('Row not found')
    }

    return result[0]
  }

  /**
   * Define a relationship to be preloaded
   */
  public preload (relationName: string, userCallback?: PreloadCallback): this {
    const { primary, relation, children, callback } = this._parseRelationName(relationName, userCallback)

    const payload = this._preloads[primary] || { relation, children: [] }
    if (children) {
      payload.children.push(children)
    } else {
      payload.callback = callback!
    }

    this._preloads[primary] = payload
    return this
  }

  /**
   * Returns the client to be used by the [[Executable]] trait
   * to running the query
   */
  public getQueryClient () {
    return this.client!.getReadClient().client
  }
}
