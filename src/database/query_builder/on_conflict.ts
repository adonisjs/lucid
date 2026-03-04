/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Knex } from 'knex'

import type { InsertQueryBuilder } from './insert.js'

/**
 * Exposes the API to configure the on conflict clause for insert queries
 */
export class OnConflictQueryBuilder {
  constructor(
    private knexOnConflictBuilder: Knex.OnConflictQueryBuilder<any, any>,
    private insertQueryBuilder: InsertQueryBuilder
  ) {}

  /**
   * Ignore the conflicting row
   */
  ignore(): InsertQueryBuilder {
    this.knexOnConflictBuilder.ignore()
    return this.insertQueryBuilder
  }

  /**
   * Merge the conflicting row with the new values
   */
  merge(columnsOrValues?: any): InsertQueryBuilder {
    if (columnsOrValues && !Array.isArray(columnsOrValues) && typeof columnsOrValues === 'object') {
      const transformedValues = Object.keys(columnsOrValues).reduce((result: any, key) => {
        result[key] = this.insertQueryBuilder['transformValue'](columnsOrValues[key])
        return result
      }, {})
      this.knexOnConflictBuilder.merge(transformedValues)
    } else if (columnsOrValues) {
      this.knexOnConflictBuilder.merge(columnsOrValues)
    } else {
      this.knexOnConflictBuilder.merge()
    }

    return this.insertQueryBuilder
  }
}
