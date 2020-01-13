/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import knex from 'knex'
import { Exception } from '@poppinss/utils'
import { ProfilerActionContract } from '@ioc:Adonis/Core/Profiler'

import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

/**
 * End the profiler action
 */
function endProfilerAction (profilerAction: null | ProfilerActionContract, error?: any) {
  if (!profilerAction) {
    return
  }

  error ? profilerAction.end({ error }) : profilerAction.end()
}

/**
 * Executes the query builder instance against a custom knex client. Why do this?
 *
 * AdonisJS allows using different connection for read and write replicas and read replicas
 * can use more than one connection and hence we need to round robin between them. Now
 * doing this purely with knex is not possible, so we have found a way around it and this
 * is how it works.
 *
 * - The query builder instance is always created using the `write` connection. It doesn't matter
 *   which connection we use, we just have to pick one.
 * - When executing the query, we ask the Queryclient of AdonisJS to give us the read or write
 *   connection based upon the type of query. The `insert`, `update` and `del` actions makes
 *   use of `write` connection.
 * - For read queries, it will again ask the QueryClient to give a new connection using round
 *   robin.
 */
async function runQueryUsingManagedConnection (
  knexClient: knex,
  query: knex.QueryBuilder | knex.Raw,
  profilerAction: null | ProfilerActionContract,
) {
  /**
   * Acquire connection from the client and set it as the
   * connection to be used for executing the query.
   */
  const connection = await knexClient['acquireConnection']()
  query.connection(connection)

  let queryError: any = null
  let queryResult: any = null

  /**
   * Executing the query and catching exceptions so that we can
   * dispose the connection before raising exception from this
   * method
   */
  try {
    queryResult = await query
    endProfilerAction(profilerAction)
  } catch (error) {
    queryError = error
    endProfilerAction(profilerAction, error)
  }

  /**
   * Releasing the connection back to pool
   */
  knexClient['releaseConnection'](connection)

  /**
   * Re-throw if there was an exception
   */
  if (queryError) {
    throw queryError
  }

  /**
   * Return result
   */
  return queryResult
}

/**
 * Executes the knex query builder against AdonisJS query client
 */
export async function executeQuery (
  query: knex.QueryBuilder | knex.Raw,
  client: QueryClientContract | TransactionClientContract,
  profilerAction: null | ProfilerActionContract,
): Promise<any> {
  /**
   * - There is no read/write replicas concept for sqlite. So execute the query as it is.
   * - When query is using an explicit transaction, then we execute the query on the same
   *   connection.
   */
  if (client.dialect.name === 'sqlite3' || query['client'].transacting) {
    try {
      const result = await query
      endProfilerAction(profilerAction)
      return result
    } catch (error) {
      endProfilerAction(profilerAction, error)
      throw error
    }
  }

  /**
   * Disallow insert, updates and delete when client is in read mode.
   */
  const isWriteQuery = ['update', 'del', 'insert'].includes(query['_method'])
  if (isWriteQuery && client.mode === 'read') {
    throw new Exception('Updates and deletes cannot be performed in read mode')
  }

  const queryClient = isWriteQuery ? client.getWriteClient() : client.getReadClient()
  return runQueryUsingManagedConnection(queryClient['client'], query, profilerAction)
}
