/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../../adonis-typings/index.ts" />

import knex from 'knex'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ManyToManyRelationContract, ManyToManyQueryBuilderContract } from '@ioc:Adonis/Lucid/Model'

import { ModelQueryBuilder } from '../../QueryBuilder'

export class ManyToManyQueryBuilder extends ModelQueryBuilder implements ManyToManyQueryBuilderContract {
  constructor (
    builder: knex.QueryBuilder,
    private _relation: ManyToManyRelationContract,
    client: QueryClientContract,
  ) {
    super(builder, _relation.relatedModel(), client)
  }

  public pivotColumns (columns: string[]): this {
    this.$knexBuilder.select(columns.map((column) => {
      return `${this._relation.pivotTable}.${column} as pivot_${column}`
    }))
    return this
  }
}
