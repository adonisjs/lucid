/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { FieldContext } from '@vinejs/vine/types'
import type { Database } from '../database/main.js'
import type { DatabaseQueryBuilderContract } from './querybuilder.js'

/**
 * Options for the unique and the exists validations
 */
export type VineDbSearchOptions<ValueType> = {
  /**
   * Database table for the query
   */
  table: string

  /**
   * The column against which to search the value
   */
  column?: string

  /**
   * Specify a custom connection for the query
   */
  connection?: string

  /**
   * Enable to perform a case insensitive search on the column. The
   * current value and the existing value in the database will be
   * lowercased using the "lower" function
   *
   * https://www.sqlite.org/lang_corefunc.html#lower
   * https://docs.aws.amazon.com/redshift/latest/dg/r_LOWER.html
   * https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_lower
   * https://www.postgresql.org/docs/9.1/functions-string.html
   * https://docs.microsoft.com/en-us/sql/t-sql/functions/lower-transact-sql?view=sql-server-ver15
   * https://coderwall.com/p/6yhsuq/improve-case-insensitive-queries-in-postgres-using-smarter-indexes
   */
  caseInsensitive?: boolean

  /**
   * Apply a custom filter to the query builder
   */
  filter?: (
    db: DatabaseQueryBuilderContract,
    value: ValueType,
    field: FieldContext
  ) => void | Promise<void>
}

/**
 * Callback to self execute the query for the unique and the
 * exists validations
 */
export type VineDbSearchCallback<ValueType> = (
  db: Database,
  value: ValueType,
  field: FieldContext
) => Promise<boolean>
