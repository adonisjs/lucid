/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import knex from 'knex'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { RelationBaseQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { HasMany } from './index'
import { getValue, unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class HasManyQueryBuilder extends BaseQueryBuilder implements RelationBaseQueryBuilderContract<
ModelConstructorContract,
ModelConstructorContract
> {
  protected appliedConstraints: boolean = false

  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: ModelContract | ModelContract[],
    private relation: HasMany,
    isEager: boolean = false,
  ) {
    super(builder, client, relation, isEager, (userFn) => {
      return (__builder) => {
        userFn(new HasManyQueryBuilder(__builder, this.client, this.parent, this.relation))
      }
    })
  }

  /**
   * Profiler data for HasMany relationship
   */
  protected profilerData () {
    return {
      relation: this.relation.type,
      model: this.relation.model.name,
      relatedModel: this.relation.relatedModel().name,
    }
  }

  /**
   * The keys for constructing the join query
   */
  protected getRelationKeys (): string[] {
    return [this.relation.foreignKey]
  }

  /**
   * Clones the current query
   */
  public clone () {
    const clonedQuery = new HasManyQueryBuilder(
      this.knexQuery.clone(),
      this.client,
      this.parent,
      this.relation,
      this.isEager,
    )

    this.applyQueryFlags(clonedQuery)
    clonedQuery.appliedConstraints = this.appliedConstraints
    return clonedQuery
  }

  /**
   * Applies constraint to limit rows to the current relationship
   * only.
   */
  public applyConstraints () {
    if (this.appliedConstraints) {
      return
    }

    const queryAction = this.queryAction()
    this.appliedConstraints = true

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      this.whereIn(this.relation.foreignKey, unique(this.parent.map((model) => {
        return getValue(model, this.relation.localKey, this.relation, queryAction)
      })))
      return
    }

    /**
     * Query constraints
     */
    const value = getValue(this.parent, this.relation.localKey, this.relation, queryAction)
    this.where(this.relation.foreignKey, value)
  }

  /**
   * Same as standard model query builder paginate method. But ensures that
   * it is not invoked during eagerloading
   */
  public paginate (page: number, perPage: number = 20) {
    if (this.isEager) {
      throw new Error(`Cannot paginate relationship "${this.relation.relationName}" during preload`)
    }
    return super.paginate(page, perPage)
  }
}
