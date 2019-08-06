/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/database.ts" />

import * as knex from 'knex'
import { DatabaseQueryBuilderContract, QueryCallback } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'
import { BaseQueryBuilder } from '../BaseQueryBuilder'

/**
 * Wrapping the user function for a query callback and give them
 * a new instance of the `DatabaseQueryBuilder` and not
 * knex.QueryBuilder
 */
function queryCallback (userFn: QueryCallback<DatabaseQueryBuilderContract>) {
  return (builder: knex.QueryBuilder) => {
    // @ts-ignore
    userFn(new DatabaseQueryBuilder(builder))
  }
}

// @ts-ignore
export class DatabaseQueryBuilder extends BaseQueryBuilder implements DatabaseQueryBuilderContract {
  constructor (client: knex.QueryBuilder) {
    super(client, queryCallback)
  }

  // @ts-ignore
  public select (): this {
    this.$knexBuilder.select(...arguments)
    return this
  }
}
