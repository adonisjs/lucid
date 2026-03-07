/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  type ConnectionConfig,
  type QueryClientContract,
  type PostgreConfig,
  type MysqlConfig,
} from '../../types/database.js'
import { type SchemaStateContract } from './base_schema_state.js'
import { MysqlSchemaState } from './schema_states/mysql.js'
import { PgSchemaState } from './schema_states/postgres.js'
import { SqliteSchemaState } from './schema_states/sqlite.js'

/**
 * Returns the dialect-specific schema state implementation for a connection.
 */
export function createSchemaState(
  client: QueryClientContract,
  connectionConfig: ConnectionConfig,
  schemaTableName: string,
  schemaVersionsTableName: string
): SchemaStateContract {
  switch (connectionConfig.client) {
    case 'sqlite':
    case 'sqlite3':
    case 'better-sqlite3':
      return new SqliteSchemaState(
        client,
        connectionConfig,
        schemaTableName,
        schemaVersionsTableName
      )
    case 'mysql':
    case 'mysql2':
      return new MysqlSchemaState(
        client,
        connectionConfig as MysqlConfig,
        schemaTableName,
        schemaVersionsTableName
      )
    case 'pg':
    case 'postgres':
    case 'postgresql':
      return new PgSchemaState(
        client,
        connectionConfig as PostgreConfig,
        schemaTableName,
        schemaVersionsTableName
      )
    default:
      throw new Error(`Schema dumps are not supported for "${connectionConfig.client}" yet`)
  }
}
