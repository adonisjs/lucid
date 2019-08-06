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
import { RawContract } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

export class RawQueryBuilder implements RawContract {
  constructor (protected $knexBuilder: knex.Raw) {
  }

  public wrap (before: string, after: string): this {
    this.$knexBuilder.wrap(before, after)
    return this
  }

  public toQuery (): string {
    return this.$knexBuilder.toQuery()
  }

  public toSQL (): knex.Sql {
    return this.$knexBuilder.toSQL()
  }
}
