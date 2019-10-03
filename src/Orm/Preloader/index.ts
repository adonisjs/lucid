/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'
import {
  ModelContract,
  PreloadCallback,
  RelationContract,
  ModelConstructorContract,
  ManyToManyExecutableQueryBuilder,
} from '@ioc:Adonis/Lucid/Model'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

type PreloadNode = {
  relation: RelationContract,
  callback?: PreloadCallback,
  children: { relationName: string, callback?: PreloadCallback }[],
}

/**
 * Exposes the API to define and preload relationships in reference to
 * a model
 */
export class Preloader {
  /**
   * Registered preloads
   */
  private _preloads: { [key: string]: PreloadNode } = {}

  constructor (private _model: ModelConstructorContract) {
  }

  /**
   * Returns the preload node for the a given relationship name
   */
  private _getPreloadedRelation (name: string) {
    const relation = this._preloads[name]
    if (!relation) {
      throw new Exception(`Cannot process unregistered relationship ${name}`, 500)
    }

    relation.relation.boot()
    return relation
  }

  /**
   * Execute the related query
   */
  private async _executeQuery (
    query: ManyToManyExecutableQueryBuilder,
    preload: PreloadNode,
  ): Promise<ModelContract[]> {
    /**
     * Pass nested preloads
     */
    preload.children.forEach(({ relationName, callback }) => query.preload(relationName, callback))

    /**
     * Invoke callback when defined
     */
    if (typeof (preload.callback) === 'function') {
      /**
       * Type casting to superior type.
       */
      preload.callback(query as ManyToManyExecutableQueryBuilder)
    }

    /**
     * Execute query
     */
    return query.exec()
  }

  /**
   * Parses the relation name for finding nested relations. The
   * children `relationName` must be further parsed until
   * the last segment
   */
  public parseRelationName (relationName: string) {
    const relations = relationName.split('.')
    const primary = relations.shift()!
    const relation = this._model.$getRelation(primary)

    /**
     * Undefined relationship
     */
    if (!relation) {
      throw new Exception(
        `${primary} is not defined as a relationship on ${this._model.name} model`,
        500,
        'E_UNDEFINED_RELATIONSHIP',
      )
    }

    return {
      primary,
      relation,
      children: relations.length ? { relationName: relations.join('') } : null,
    }
  }

  /**
   * Define relationship to be preloaded
   */
  public preload (relationName: string, userCallback?: PreloadCallback) {
    const { primary, relation, children } = this.parseRelationName(relationName)

    const payload = this._preloads[primary] || { relation, children: [] }
    if (children) {
      payload.children.push(Object.assign(children, { callback: userCallback }))
    } else {
      payload.callback = userCallback
    }

    this._preloads[primary] = payload
    return this
  }

  /**
   * Process a single relationship for a single parent model
   */
  public async processForOne (
    name: string,
    model: ModelContract,
    client: QueryClientContract,
  ): Promise<void> {
    /**
     * Get the relation
     */
    const relation = this._getPreloadedRelation(name)

    /**
     * Pull query for a single parent model instance
     */
    const query = relation.relation.getQuery(model, client)

    /**
     * Execute the query
     */
    const result = await this._executeQuery(query as ManyToManyExecutableQueryBuilder, relation)

    /**
     * Set only one when relationship is hasOne or belongsTo
     */
    if (['hasOne', 'belongsTo'].includes(relation.relation.type)) {
      relation.relation.setRelated(model, result[0])
      return
    }

    /**
     * Set relationships on model
     */
    relation.relation.setRelated(model, result)
  }

  /**
   * Process a single relationship for a many parent models
   */
  public async processForMany (
    name: string,
    models: ModelContract[],
    client: QueryClientContract,
  ): Promise<void> {
    /**
     * Get the relation
     */
    const relation = this._getPreloadedRelation(name)

    /**
     * Pull query for a single parent model instance
     */
    const query = relation.relation.getEagerQuery(models, client)

    /**
     * Execute the query
     */
    const result = await this._executeQuery(query as ManyToManyExecutableQueryBuilder, relation)

    /**
     * Set relationships on model
     */
    relation.relation.setRelatedMany(models, result)
  }

  /**
   * Process all preloaded for many parent models
   */
  public async processAllForMany (models: ModelContract[], client: QueryClientContract): Promise<void> {
    await Promise.all(Object.keys(this._preloads).map((name) => {
      return this.processForMany(name, models, client)
    }))
  }

  /**
   * Processes all relationships for one parent model
   */
  public async processAllForOne (model: ModelContract, client: QueryClientContract): Promise<void> {
    await Promise.all(Object.keys(this._preloads).map((name) => {
      return this.processForOne(name, model, client)
    }))
  }
}
