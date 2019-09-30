/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import knex from 'knex'
import { trait } from '@poppinss/traits'

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { RawContract } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

import { Executable, ExecutableConstructor } from '../../Traits/Executable'

/**
 * Exposes the API to execute raw queries
 */
@trait<ExecutableConstructor>(Executable)
export class RawQueryBuilder implements RawContract {
  constructor (public $knexBuilder: knex.Raw, public client: QueryClientContract) {
  }

  /**
   * It's impossible to judge the client for the raw query and
   * hence we always use the default client
   */
  public getQueryClient () {
    return undefined
  }

  /**
   * Returns the profiler action
   */
  public getProfilerAction () {
    if (!this.client.profiler) {
      return null
    }

    return this.client.profiler.profile('sql:query', Object.assign(this['toSQL'](), {
      connection: this.client.connectionName,
      inTransaction: this.client.isTransaction,
    }))
  }

  /**
   * Wrap the query with before/after strings.
   */
  public wrap (before: string, after: string): this {
    this.$knexBuilder.wrap(before, after)
    return this
  }
}
