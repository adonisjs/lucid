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
  LucidRow,
  LucidModel,
  ModelObject,
  PreloaderContract,
  RelationshipsContract,
  RelationQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Orm'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

/**
 * Exposes the API to define and preload relationships in reference to
 * a model
 */
export class Preloader implements PreloaderContract<LucidRow> {
  private preloads: {
    [name: string]: {
      relation: RelationshipsContract
      callback?: (builder: RelationQueryBuilderContract<LucidModel, any>) => void
    }
  } = {}

  /**
   * When invoked via query builder. The preloader will get the sideloaded
   * object, that should be transferred to relationship model instances.
   */
  private sideloaded: ModelObject = {}

  /**
   * Control whether to debug the query or not. The initial
   * value is inherited from the query client
   */
  private debugQueries: boolean = this.client.debug

  constructor(private model: LucidModel, private client: QueryClientContract) {}

  /**
   * Processes a relationship for a single parent
   */
  private async processRelation(name: string, parent: LucidRow) {
    const { relation, callback } = this.preloads[name]
    const query = relation
      .eagerQuery(parent, this.client)
      .debug(this.debugQueries)
      .sideload(this.sideloaded)

    /**
     * Pass query to end user for adding more constraints
     */
    if (typeof callback === 'function') {
      callback(query)
    }

    const result = await query.selectRelationKeys().exec()

    /**
     * hasOne and belongsTo will always return an array of a single row (if done right)
     */
    if (relation.type === 'hasOne' || relation.type === 'belongsTo') {
      relation.setRelated(parent, result[0] || null)
      return
    }

    /**
     * Set array of related instances
     */
    relation.setRelated(parent, result)
  }

  /**
   * Process a given relationship for many parent instances. This happens
   * during eagerloading
   */
  private async processRelationForMany(name: string, parent: LucidRow[]) {
    const { relation, callback } = this.preloads[name]
    const query = relation
      .eagerQuery(parent, this.client)
      .debug(this.debugQueries)
      .sideload(this.sideloaded)

    /**
     * Pass query to end user for adding more constraints
     */
    if (typeof callback === 'function') {
      callback(query)
    }

    const result = await query.selectRelationKeys().exec()

    /**
     * Set array of related instances
     */
    relation.setRelatedForMany(parent, result)
  }

  /**
   * Define a relationship to preload
   */
  public load(name: any, callback?: any): this {
    const relation = this.model.$getRelation(name) as RelationshipsContract
    if (!relation) {
      throw new Exception(
        `"${name}" is not defined as a relationship on "${this.model.name}" model`,
        500,
        'E_UNDEFINED_RELATIONSHIP'
      )
    }

    relation.boot()
    this.preloads[name] = {
      relation: relation,
      callback: callback,
    }

    return this
  }

  /**
   * Alias for "this.load"
   */
  public preload(name: any, callback?: any): this {
    return this.load(name, callback)
  }

  /**
   * Toggle query debugging
   */
  public debug(debug: boolean) {
    this.debugQueries = debug
    return this
  }

  /**
   * Define attributes to be passed to all the model instance as
   * sideloaded attributes
   */
  public sideload(values: ModelObject): this {
    this.sideloaded = values
    return this
  }

  /**
   * Process of all the preloaded relationships for a single parent
   */
  public async processAllForOne(parent: LucidRow) {
    await Promise.all(
      Object.keys(this.preloads).map((relationName) => {
        return this.processRelation(relationName, parent)
      })
    )
  }

  /**
   * Process of all the preloaded relationships for many parents
   */
  public async processAllForMany(parent: LucidRow[]) {
    if (!parent.length) {
      return
    }

    await Promise.all(
      Object.keys(this.preloads).map((relationName) => {
        return this.processRelationForMany(relationName, parent)
      })
    )
  }
}
