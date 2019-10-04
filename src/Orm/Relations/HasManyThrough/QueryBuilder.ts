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
import { HasManyThroughQueryBuilderContract, RelationContract } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

import { ModelQueryBuilder } from '../../QueryBuilder'

/**
 * Exposes the API for interacting with has many relationship
 */
export class HasManyThroughQueryBuilder extends ModelQueryBuilder implements HasManyThroughQueryBuilderContract<any> {
  constructor (
    builder: knex.QueryBuilder,
    private _relation: RelationContract,
    client: QueryClientContract,
  ) {
    super(builder, _relation.relatedModel(), client, (userFn) => {
      return (builder) => {
        userFn(new HasManyThroughQueryBuilder(builder, this._relation, this.client))
      }
    })
  }
}
