/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type PostgreConfig } from '../../../types/database.js'

/**
 * Normalized PostgreSQL connection settings consumed by `pg_dump` and `psql`.
 */
export type PostgresCliConnection = {
  host: string
  port: string
  user: string
  password: string
  database: string
}

/**
 * Convert a Lucid PostgreSQL connection config into the shape expected by the
 * PostgreSQL CLI tools.
 */
export function normalizePostgresCliConnection(
  connection: PostgreConfig['connection']
): PostgresCliConnection {
  if (!connection) {
    throw new Error('Incomplete PostgreSQL connection config. Cannot create schema dump')
  }

  /**
   * Prefer an explicit connection string when present, since it already
   * contains the exact host/port/auth tuple expected by the CLI tools.
   */
  if (typeof connection === 'string') {
    return parseConnectionString(connection)
  }

  if (connection.connectionString) {
    return parseConnectionString(connection.connectionString)
  }

  if (!connection.database || !connection.user) {
    throw new Error('Incomplete PostgreSQL connection config. Cannot create schema dump')
  }

  return {
    host: connection.host ?? '127.0.0.1',
    port: String(connection.port ?? 5432),
    user: connection.user,
    password: connection.password ?? '',
    database: connection.database,
  }
}

/**
 * Parse a PostgreSQL connection string into the normalized structure used by
 * the CLI integration helpers.
 */
function parseConnectionString(connectionString: string): PostgresCliConnection {
  const url = new URL(connectionString)

  return {
    host: url.hostname || '127.0.0.1',
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  }
}
