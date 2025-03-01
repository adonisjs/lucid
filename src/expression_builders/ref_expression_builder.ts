/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { TO_KNEX } from '../symbols.js'

/**
 * Refs can be used to reference column names as value when
 * executing SQL queries.
 */
export class RefExpressionBuilder {
  #ref: string
  #alias?: any
  #schema?: string

  constructor(ref: string) {
    this.#ref = ref
  }

  /**
   * Specify the schema to prefix
   */
  withSchema(schema: string): this {
    this.#schema = schema
    return this
  }

  /**
   * Define an alias for the column
   */
  as(alias: string): this {
    this.#alias = alias
    return this
  }

  /**
   * Convert ref to Knex.ref
   */
  [TO_KNEX](client: Knex): Knex.Ref<string, {}> {
    const ref = client.ref(this.#ref)
    this.#schema && ref.withSchema(this.#schema)
    this.#alias && ref.as(this.#alias)

    return ref
  }
}
