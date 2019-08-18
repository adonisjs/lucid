/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/database.ts" />

import * as knex from 'knex'
import { ProfilerRowContract } from '@poppinss/profiler'
import { ProfilerActionContract } from '@poppinss/profiler/build/src/Contracts'
import { QueryClientContract } from '@ioc:Adonis/Addons/DatabaseQueryBuilder'

/**
 * Returns the profiler action for the SQL query. `null` is
 * returned when profiler doesn't exists.
 */
function getProfilerAction (
  builder: knex.QueryBuilder | knex.Raw,
  profiler?: ProfilerRowContract,
  profilerData?: any,
) {
  if (!profiler) {
    return null
  }

  return profiler.profile('sql:query', Object.assign(builder.toSQL(), profilerData))
}

/**
 * Ends the profiler action
 */
function endProfilerAction (action: null | ProfilerActionContract, error?: any) {
  if (!action) {
    return
  }

  error ? action.end({ error }) : action.end()
}

/**
 * Returns a boolean telling if query builder or query client
 * is in transaction mode
 */
export function isInTransaction (
  builder: knex.QueryBuilder | knex.Raw,
  client: QueryClientContract,
) {
  if (client.isTransaction) {
    return true
  }

  return builder['client'].transacting
}

/**
 * Executes the knex query with an option to manually pull connection from
 * a dedicated knex client.
 */
export async function executeQuery (
  builder: knex.QueryBuilder | knex.Raw,
  knexClient?: knex,
  profiler?: ProfilerRowContract,
  profilerData?: any,
) {
  let action = getProfilerAction(builder, profiler, profilerData)

  if (!knexClient) {
    try {
      const result = await builder
      endProfilerAction(action)
      return result
    } catch (error) {
      endProfilerAction(action, error)
      throw error
    }
  }

  /**
   * Acquire connection from the client and set it as the
   * connection to be used for executing the query
   */
  const connection = await knexClient['acquireConnection']()
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
    endProfilerAction(action)
  } catch (error) {
    queryError = error
    endProfilerAction(action, error)
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
