/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { ReferenceBuilderContract } from '../../types/querybuilder.js'

/**
 * Reference builder to create SQL reference values
 */
export class ReferenceBuilder implements ReferenceBuilderContract {
  private schema?: string
  private alias?: string

  constructor(
    private ref: string,
    private client: Knex.Client
  ) {}

  /**
   * Define schema
   */
  withSchema(schema: string): this {
    this.schema = schema
    return this
  }

  /**
   * Define alias
   */
  as(alias: string): this {
    this.alias = alias
    return this
  }

  /**
   * Converts reference to knex
   */
  toKnex(client?: Knex.Client) {
    const ref = (client || this.client).ref(this.ref)
    this.schema && ref.withSchema(this.schema)
    this.alias && ref.as(this.alias)

    return ref
  }
}
