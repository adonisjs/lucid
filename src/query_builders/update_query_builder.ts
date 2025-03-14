/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { DatabaseClientContract } from '../types/query.js'
import { SelectExpressionBuilder } from '../expression_builders/select_expression_builder.js'
import { SharedExpressionBuilder } from '../expression_builders/shared_expression_builder.js'
import { transformValueExpressions } from '../helpers.js'

export class UpdateQueryBuilder extends SharedExpressionBuilder {
  #context: Record<string, any> = {}
  readonly queryType = 'write'

  /**
   * Flag to know if debugging it enabled or not
   */
  debugging: boolean = false

  constructor(protected client: DatabaseClientContract) {
    super(client.getWriteClient())
  }

  /**
   * Transforms the insert row object to a value that knex can process.
   */
  #transformRow(row: Record<string, any>) {
    return Object.keys(row).reduce<Record<string, any>>((result, key) => {
      const value = row[key]
      const transformedValue = transformValueExpressions(value, this, this.knex)
      if (transformedValue === undefined) {
        result[this.transformColumnName(key)] = value
      } else {
        result[this.transformColumnName(key)] = transformedValue
      }
      return result
    }, {})
  }

  /**
   * Returns the query context
   */
  getContext(): Record<string, any> {
    return this.#context
  }

  /**
   * Define the context to be shared with the "db:query" event.
   *
   * This method will override existing context with provided values.
   * Use {@link UpdateQueryBuilder.withContext} to merge values
   */
  setContext(context: Record<string, any>): this {
    this.#context = context
    return this
  }

  /**
   * Define the context to be shared with the "db:query" event.
   *
   * The provided values will be shallow merged with the existing
   * values. Use {@link UpdateQueryBuilder.setContext} to remove existing context with
   * new values.
   */
  withContext(context: Record<string, any>): this {
    Object.assign(this.#context, context)
    return this
  }

  /**
   * Returns an instance of the {@link SelectExpressionBuilder}
   */
  createSelectSubQuery() {
    return new SelectExpressionBuilder(this.client)
  }

  /**
   * Enable/disable query debugging for the current query builder.
   * Debugging will emit the "db:query" event
   */
  debug(toggle: boolean = true) {
    this.debugging = toggle
    return this
  }

  /**
   * Define the table to update
   */
  table(table: string): this {
    this.knexQuery.table(table)
    return this
  }

  /**
   * Define the values to set when updating one or more rows. Values must be
   * a key-value pair in which key is a string can value could be one of
   * the following
   *
   * - A literal value to insert to the database.
   * - {@link RefExpressionBuilder} to point to an existing value.
   * - {@link SelectExpressionBuilder} to define the value from a select query.
   * - {@link RawExpressionBuilder} to define the value using a raw query.
   *
   * @example
   * ```ts
   * query.updateTable('users').set('first_name', 'virk')
   * query.updateTable('users').set('username', db.ref('email'))
   *
   * query.updateTable('users').set({
   *   first_name: 'Harminder',
   *   last_name: 'Virk',
   *   username: 'virk@adonisjs.com',
   *   email: 'virk@adonisjs.com',
   *   age: 35,
   *   role_id: (q: SelectExpressionBuilder) =>
   *     q.from('roles').select('id').where('is_default', true),
   *  })
   * ```
   */
  set(
    key: string,
    value: any,
    options?: {
      includeTriggerModifications: boolean
    }
  ): this
  set(
    values: Record<string, any>,
    options?: {
      includeTriggerModifications: boolean
    }
  ): this
  set(
    keyOrValues: Record<string, any> | string,
    value: any,
    options?: {
      includeTriggerModifications: boolean
    }
  ): this {
    if (typeof keyOrValues === 'string') {
      const transformedKey = this.transformColumnName(keyOrValues)
      const transformedValue = value ? transformValueExpressions(value, this, this.knex) : undefined
      this.knexQuery.update(transformedKey, transformedValue ?? value, [], options)
      return this
    }

    this.knexQuery.update(this.#transformRow(keyOrValues), [], options)
    return this
  }

  /**
   * Executes the update query using the database client
   */
  exec<T = any>(): Promise<T> {
    return this.client.exec<T>(this)
  }
}
