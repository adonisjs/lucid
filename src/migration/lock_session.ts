/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Knex } from 'knex'
// @ts-expect-error
import makeKnex from 'knex/lib/knex-builder/make-knex.js'

import { QueryClient } from '../query_client/index.js'
import { type ConnectionContract, type QueryClientContract } from '../types/database.js'

/**
 * Returns a knex instance whose client always uses the given connection
 * and never gives it back to the pool. Knex makes the client of its
 * transactions the same way (see "makeTxClient" in
 * "knex/lib/execution/transaction.js").
 *
 * Unlike a transaction client, this client is not "transacting". Therefore,
 * a transaction created from it runs "BEGIN" on the pinned connection.
 */
function makePinnedKnex(knex: Knex, connection: any): Knex {
  const client = knex.client
  const pinnedClient = Object.create(client.constructor.prototype)

  pinnedClient.version = client.version
  pinnedClient.config = client.config
  pinnedClient.driver = client.driver
  pinnedClient.connectionSettings = client.connectionSettings
  pinnedClient.valueForUndefined = client.valueForUndefined
  pinnedClient.logger = client.logger

  for (const event of ['start', 'query', 'query-error', 'query-response']) {
    pinnedClient.on(event, (...args: any[]) => client.emit(event, ...args))
  }

  pinnedClient.acquireConnection = function () {
    return Promise.resolve(connection)
  }
  pinnedClient.releaseConnection = function () {
    return Promise.resolve()
  }

  return makeKnex(pinnedClient)
}

/**
 * A database session that the migration runner takes from the pool of
 * a connection, and keeps for the whole run.
 *
 * Advisory locks belong to a database session. The runner takes the lock,
 * runs each migration, and releases the lock on this session. Therefore,
 * when the session ends, the database releases the lock and the active
 * migration fails with it.
 */
export class LockSession {
  /**
   * Takes a connection from the pool of the given connection and pins
   * a query client to it
   */
  static async open(connection: ConnectionContract, client: QueryClientContract) {
    const knex = client.getWriteClient()
    const rawConnection = await knex.client.acquireConnection()
    return new LockSession(connection, client, knex, rawConnection)
  }

  /**
   * The query client that runs each query on the pinned connection
   */
  readonly client: QueryClientContract

  private constructor(
    connection: ConnectionContract,
    parentClient: QueryClientContract,
    private knex: Knex,
    private rawConnection: any
  ) {
    const pinnedKnex = makePinnedKnex(knex, rawConnection)
    this.client = new QueryClient(
      'write',
      {
        name: connection.name,
        clientName: connection.clientName,
        config: connection.config,
        client: pinnedKnex,
        readClient: pinnedKnex,
      } as ConnectionContract,
      parentClient.emitter
    )
  }

  /**
   * Returns true when the database session of the pinned connection
   * has ended. For example, after "pg_terminate_backend" or "KILL".
   */
  isLost(): boolean {
    return (
      !!this.rawConnection.__knex__disposed ||
      !this.knex.client.validateConnection(this.rawConnection)
    )
  }

  /**
   * Gives the connection back to the pool
   */
  release() {
    this.knex.client.releaseConnection(this.rawConnection)
  }

  /**
   * Closes the connection of a lost session. The connection is marked as
   * disposed, so that the pool destroys it and never gives it to a query.
   */
  async destroy() {
    this.rawConnection.__knex__disposed ??= 'The session of the migration lock has ended'

    try {
      await this.knex.client.destroyRawConnection(this.rawConnection)
    } catch {}

    this.knex.client.releaseConnection(this.rawConnection)
  }
}
