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
import { ModelConstructorContract } from '@ioc:Adonis/Lucid/Model'
import { DBQueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { RelationBaseQueryBuilderContract, RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'

import { ModelQueryBuilder } from '../../QueryBuilder'

/**
 * Base query builder for ORM relationships
 */
export abstract class BaseQueryBuilder extends ModelQueryBuilder implements RelationBaseQueryBuilderContract<
ModelConstructorContract,
ModelConstructorContract
> {
  protected $appliedConstraints: boolean = false

  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    relation: RelationshipsContract,
    private isEager: boolean,
    dbCallback: DBQueryCallback,
  ) {
    super(builder, relation.$relatedModel(), client, dbCallback)
  }

  /**
   * Returns the name of the query action
   */
  protected $queryAction (): string {
    let action = this.$knexBuilder['_method']
    if (action === 'del') {
      action = 'delete'
    }

    if (action === 'select' && this.isEager) {
      action = 'preload'
    }

    return action
  }

  public abstract applyConstraints ()
  public abstract getRelationKeys (): string[]

  /**
   * Selects the relation keys. Invoked by the preloader
   */
  public selectRelationKeys (): this {
    const columns = this.$knexBuilder['_statements'].find((statement) => {
      return statement.grouping && statement.grouping === 'columns'
    })

    if (!columns) {
      return this
    }

    /**
     * Add the relation keys to the select statement, when user has defined
     * one or more columns and forgot to define the relation keys.
     */
    this.getRelationKeys().forEach((key) => {
      if (!columns.value.includes(key)) {
        columns.value.push(key)
      }
    })

    return this
  }

  /**
   * Adds neccessary where clause to the query to perform the select
   */
  public async beforeExecute () {
    this.applyConstraints()
  }

  /**
   * Get query sql
   */
  public toSQL () {
    this.applyConstraints()
    return super['toSQL']()
  }
}
