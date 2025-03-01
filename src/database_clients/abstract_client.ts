/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Knex } from 'knex'

import * as errors from '../errors.js'
import type { Connection } from '../connection.js'
import { SelectQueryBuilder } from '../query_builders/select_query_builder.js'
import { RawExpressionBuilder } from '../expression_builders/raw_expression_builder.js'
import { RefExpressionBuilder } from '../expression_builders/ref_expression_builder.js'
import type { DatabaseClientContract, RawQueryBindings } from '../types/query.js'

export abstract class DatabaseClient implements DatabaseClientContract {
  #connection: Connection

  /**
   * Callbacks to execute when a new instance of the select query
   * builder is created
   */
  #selectQueryCallbacks: ((query: SelectQueryBuilder) => void)[] = []

  /**
   * Enable/disable query debugging for all the queries initiated
   * using the given instance of the database client
   */
  debug: boolean = false

  /**
   * A flag to know if the current instance of database client is a
   * transaction
   */
  isTransaction: boolean = false

  /**
   * The name of the connection from which the client
   * was originated.
   *
   * @deprecated
   * Instead use {@link Connection.identifier}
   */
  get connectionName() {
    return this.#connection.identifier
  }

  get connectionIdentifier() {
    return this.#connection.identifier
  }

  constructor(
    connection: Connection,
    public readonly mode: DatabaseClientContract['mode']
  ) {
    this.#connection = connection
  }

  /**
   * Returns reference to the read client for executing the
   * read queries.
   *
   * - Returns write client when `mode=write`
   * - Returns read client when `mode=dual|read`.
   */
  getReadClient(): Knex {
    if (this.mode === 'write') {
      return this.#connection.getWriteClient()
    }
    return this.#connection.getReadClient()
  }

  /**
   * Returns reference to the write client for executing the
   * write queries. This method will throw an error when the
   * DatabaseClient instance is created in "read" mode.
   */
  getWriteClient(): Knex {
    if (this.mode === 'read') {
      throw new errors.E_CANNOT_PERFORM_WRITE_QUERIES()
    }
    return this.#connection.getWriteClient()
  }

  /**
   * Returns instance of the {@link RefExpressionBuilder}
   */
  ref(reference: string): RefExpressionBuilder {
    return new RefExpressionBuilder(reference)
  }

  /**
   * Returns instance of the {@link RawExpressionBuilder}
   */
  raw(sql: string, bindings?: RawQueryBindings): RawExpressionBuilder {
    return new RawExpressionBuilder(sql, bindings)
  }

  /**
   * Listen when a new instance of the {@link SelectQueryBuilder} is created
   */
  onQuery(callback: (query: SelectQueryBuilder) => void): void {
    this.#selectQueryCallbacks.push(callback)
  }

  /**
   * Creates an instance of the {@link SelectQueryBuilder}
   */
  query() {
    return new SelectQueryBuilder(this)
  }
}
