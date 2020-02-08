/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import knex from 'knex'
import { Exception } from '@poppinss/utils'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { RelationBaseQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { BelongsTo } from './index'
import { unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class BelongsToQueryBuilder extends BaseQueryBuilder implements RelationBaseQueryBuilderContract<
ModelConstructorContract,
ModelConstructorContract
> {
  private appliedConstraints: boolean = false

  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: ModelContract | ModelContract[],
    private relation: BelongsTo,
    isEager: boolean = false,
  ) {
    super(builder, client, relation, isEager, (userFn) => {
      return (__builder) => {
        userFn(new BelongsToQueryBuilder(__builder, this.client, this.parent, this.relation))
      }
    })
  }

  /**
   * The profiler data for belongsTo relatioship
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
    return [this.relation.localKey]
  }

  /**
   * Raises exception that FK value is null
   */
  private enforceFkValueToExist (): never {
    const { relationName, foreignKey } = this.relation
    const modelName = this.relation.model.name

    throw new Exception(
      [
        `Cannot preload "${relationName}", value of "${modelName}.${foreignKey}" is undefined.`,
        'Make sure to set "null" as the default value for foreign keys',
      ].join(' '),
      500,
    )
  }

  /**
   * Applies constraint to limit rows to the current relationship
   * only.
   */
  public applyConstraints () {
    if (this.appliedConstraints) {
      return
    }

    this.appliedConstraints = true
    const queryAction = this.queryAction()

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      const foreignKeyValues = this.parent
        .map((model) => model[this.relation.foreignKey])
        .filter((foreignKeyValue) => {
          if (foreignKeyValue === undefined) {
            this.enforceFkValueToExist()
          }
          return foreignKeyValue !== null
        })

      this.whereIn(this.relation.localKey, unique(foreignKeyValues))
      return
    }

    /**
     * Query constraints
     */
    if (this.parent[this.relation.foreignKey] === undefined) {
      this.enforceFkValueToExist()
    }
    this.where(this.relation.localKey, this.parent[this.relation.foreignKey])

    /**
     * Do not add limit when updating or deleting
     */
    if (!['update', 'delete'].includes(queryAction)) {
      this.limit(1)
    }
  }
}
