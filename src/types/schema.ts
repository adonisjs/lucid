/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'
import { type QueryClientContract } from './database.js'

/**
 * Column builder returned by the foreignId helper
 */
export interface ForeignIdColumnBuilder extends Knex.ColumnBuilder {
  nullable(): ForeignIdColumnBuilder
  notNullable(): ForeignIdColumnBuilder
  unsigned(): ForeignIdColumnBuilder
  constrained(
    tableName?: string,
    referencedColumnName?: string,
    foreignKeyName?: string
  ): Knex.ReferencingColumnBuilder
}

declare module 'knex' {
  namespace Knex {
    interface TableBuilder {
      foreignId(columnName: string): ForeignIdColumnBuilder
    }
  }
}

/**
 * Shape of callback to defer database calls
 */
export type DeferCallback = (client: QueryClientContract) => void | Promise<void>
