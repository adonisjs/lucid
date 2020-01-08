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

import { BelongsTo } from './index'
import { getValue, unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class BelongsToQueryBuilder extends BaseQueryBuilder implements RelationBaseQueryBuilderContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: ModelContract | ModelContract[],
    protected $relation: BelongsTo,
    isEager: boolean = false,
  ) {
    super(builder, client, $relation, isEager, (userFn) => {
      return (__builder) => {
        userFn(new BelongsToQueryBuilder(__builder, this.client, this.parent, this.$relation))
      }
    })
  }

  /**
   * Applies constraint to limit rows to the current relationship
   * only.
   */
  public applyConstraints () {
    if (this.$appliedConstraints) {
      return
    }

    this.$appliedConstraints = true
    const queryAction = this.$queryAction()

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      this.knexQuery.whereIn(this.$relation.$localCastAsKey, unique(this.parent.map((model) => {
        return getValue(model, this.$relation.$foreignKey, this.$relation, queryAction)
      })))
      return
    }

    /**
     * Query constraints
     */
    const value = getValue(this.parent, this.$relation.$foreignKey, this.$relation, queryAction)
    this.knexQuery.where(this.$relation.$localCastAsKey, value)

    /**
     * Do not add limit when updating or deleting
     */
    if (!['update', 'delete'].includes(queryAction)) {
      this.knexQuery.limit(1)
    }
  }

  /**
   * The keys for constructing the join query
   */
  public getRelationKeys (): string[] {
    return [this.$relation.$localKey]
  }
}
