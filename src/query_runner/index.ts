/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { Exception } from '@poppinss/utils'
import { QueryReporter } from '../query_reporter/index.js'
import { QueryClientContract, TransactionClientContract } from '../types/database.js'

/**
 * Query runner exposes the API for executing knex query builder by using the
 * read/write replicas supported only by Lucid.
 *
 * Also it will emit the query data and profile the queries as well.
 */
export class QueryRunner {
  private reporter: QueryReporter

  constructor(
    private client: QueryClientContract | TransactionClientContract,
    private debug: boolean,
    private logData: any
  ) {
    this.reporter = new QueryReporter(this.client, this.debug, this.logData)
  }

  /**
   * Is query dialect using sqlite database or not
   */
  private isUsingSqlite() {
    return ['sqlite3', 'better-sqlite3', 'libsql'].includes(this.client.dialect.name)
  }

  /**
   * Find if query has a transaction attached to it, by using
   * `useTransaction` method
   */
  private isInTransaction(query: Knex.QueryBuilder | Knex.Raw) {
    return (query as any)['client'].transacting
  }

  /**
   * Find if query is a write query or not.
   */
  private isWriteQuery(query: Knex.QueryBuilder | Knex.Raw) {
    return ['update', 'del', 'delete', 'insert'].includes((query as any)['_method'])
  }

  /**
   * Returns read or write client by inspecting the query
   */
  private getQueryClient(query: Knex.QueryBuilder | Knex.Raw) {
    return this.isWriteQuery(query) ? this.client.getWriteClient() : this.client.getReadClient()
  }

  /**
   * Executes the query by handling exceptions and returns it back
   * gracefully.
   */
  private async executeQuery(
    query: Knex.QueryBuilder | Knex.Raw
  ): Promise<[Error | undefined, any | undefined]> {
    try {
      const result = await query
      return [undefined, result]
    } catch (error) {
      return [error, undefined]
    }
  }

  /**
   * Executes the knex builder directly
   */
  private async executeDirectly(query: Knex.QueryBuilder | Knex.Raw) {
    /**
     * We listen for query event on the knex query builder to avoid calling
     * toSQL too many times and also get the actual time it took to
     * execute the query
     */
    ;(query as any)['once']('query', (sql: any) => this.reporter.begin({ ...this.logData, ...sql }))

    const [error, result] = await this.executeQuery(query)
    this.reporter.end(error)

    if (error) {
      throw error
    }
    return result
  }

  /**
   * Executes query by using a proper read or write connection.
   */
  private async executeUsingManagedConnection(query: Knex.QueryBuilder | Knex.Raw) {
    const queryClient = this.getQueryClient(query)

    /**
     * Acquire connection from the knex connection pool. This is will
     * use the rounding robin mechanism and force set it on
     * the query.
     */
    const connection = await queryClient.client.acquireConnection()
    query.connection(connection)

    /**
     * We listen for query event on the knex query builder to avoid calling
     * toSQL too many times and also get the actual time it took to
     * execute the query
     */
    ;(query as any)['once']('query', (sql: any) => this.reporter.begin({ ...this.logData, ...sql }))

    /**
     * Execute query and report event and profiler data
     */
    const [error, result] = await this.executeQuery(query)
    this.reporter.end(error)

    /**
     * Make sure to always release the connection
     */
    queryClient.client.releaseConnection(connection)

    /**
     * If there was an error, raise it or return the result
     */
    if (error) {
      throw error
    }
    return result
  }

  /**
   * Run query by managing its life-cycle
   */
  async run(query: Knex.QueryBuilder | Knex.Raw) {
    /**
     * We execute the queries using transaction or using sqlite database
     * directly.
     *
     * - The transaction already has a pre-acquired connection.
     * - There is no concept of read/write replicas in sqlite.
     */
    if (this.isUsingSqlite() || this.isInTransaction(query)) {
      return this.executeDirectly(query)
    }

    /**
     * Cannot execute write queries with client in read mode
     */
    if (this.isWriteQuery(query) && this.client.mode === 'read') {
      throw new Exception('Updates and deletes cannot be performed in read mode')
    }

    return this.executeUsingManagedConnection(query)
  }
}
