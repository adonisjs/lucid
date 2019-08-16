/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import * as knex from 'knex'

/**
 * Executes the knex query with an option to manually pull connection from
 * a dedicated knex client.
 */
export async function executeQuery (builder: knex.QueryBuilder, client?: any) {
  if (!client) {
    return builder
  }

  /**
   * Acquire connection from the client and set it as the
   * connection to be used for executing the query
   */
  const connection = await client.acquireConnection()
  builder.connection(connection)

  let queryError: any = null
  let queryResult: any = null

  /**
   * Executing the query and catching exceptions so that we can
   * dispose the connection before raising exception from this
   * method
   */
  try {
    queryResult = await builder
  } catch (error) {
    queryError = error
  }

  /**
   * Releasing the connection back to pool
   */
  client.releaseConnection(connection)

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
