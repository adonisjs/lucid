/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import knex, { Knex } from 'knex'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { mkdir, unlink } from 'node:fs/promises'

import * as errors from '../errors.js'
import LibSQLClient from '../clients/libsql.cjs'
import type { ConnectionConfig } from '../types/database.js'

/**
 * The list of clients on which the administrator can create and
 * drop databases
 */
const SUPPORTED_CLIENTS = [
  'sqlite',
  'sqlite3',
  'better-sqlite3',
  'libsql',
  'mysql',
  'mysql2',
  'pg',
  'postgres',
  'postgresql',
  'redshift',
  'mssql',
]

/**
 * The list of clients using a file backed database
 */
const FILE_BACKED_CLIENTS = ['sqlite', 'sqlite3', 'better-sqlite3', 'libsql']

/**
 * The list of clients speaking the PostgreSQL dialect
 */
const PG_CLIENTS = ['pg', 'postgres', 'postgresql', 'redshift']

/**
 * The list of clients speaking the MySQL dialect
 */
const MYSQL_CLIENTS = ['mysql', 'mysql2']

/**
 * Database administrator performs database level operations like creating
 * or dropping a database.
 *
 * Since the database in question may not exist yet, we cannot use the
 * regular lucid connections that are bound to the database defined
 * inside the config file. Instead, we create a standalone knex
 * connection to the maintenance database of the dialect
 * ("postgres" for PostgreSQL, "master" for MSSQL and
 * no database at all for MySQL).
 */
export class DatabaseAdministrator {
  #config: ConnectionConfig

  /**
   * Reference to knex. The instance is lazily created when performing
   * the first database level operation
   */
  #client?: Knex

  constructor(config: ConnectionConfig) {
    if (!SUPPORTED_CLIENTS.includes(config.client)) {
      throw new errors.E_UNSUPPORTED_DB_ADMINISTRATION([config.client])
    }

    this.#config = config
  }

  /**
   * A boolean to know if the connection uses a file backed
   * database like sqlite or libsql
   */
  private usesFileDatabase(): boolean {
    return FILE_BACKED_CLIENTS.includes(this.#config.client)
  }

  /**
   * Returns the connection node after giving preference to the
   * write replica connection (when replicas are in use)
   */
  private resolveConnectionNode() {
    const { replicas, connection } = this.#config

    if (!replicas) {
      return connection
    }

    if (typeof replicas.write.connection === 'string' || typeof connection === 'string') {
      return replicas.write.connection
    }

    return Object.assign({}, connection, replicas.write.connection)
  }

  /**
   * Returns the path to the database file for file backed databases
   */
  private fileDatabasePath(): string {
    return this.databaseName
  }

  /**
   * Returns the connection node pointing to the maintenance database
   * of the dialect. "CREATE DATABASE" and "DROP DATABASE" queries
   * cannot run over a connection attached to the database in
   * question
   */
  private getMaintenanceConnection() {
    const connection = this.resolveConnectionNode()

    if (PG_CLIENTS.includes(this.#config.client)) {
      if (typeof connection === 'string') {
        const url = new URL(connection)
        url.pathname = '/postgres'
        return url.toString()
      }
      return Object.assign({}, connection, { database: 'postgres' })
    }

    if (MYSQL_CLIENTS.includes(this.#config.client)) {
      return Object.assign({}, connection, { database: undefined })
    }

    if (this.#config.client === 'mssql') {
      return Object.assign({}, connection, { database: 'master' })
    }

    return connection
  }

  /**
   * Lazily instantiates the knex connection to the maintenance
   * database. For file backed databases, the connection points
   * to the database file itself
   */
  private getClient(): Knex {
    if (!this.#client) {
      this.#client = knex.knex({
        client: this.#config.client === 'libsql' ? (LibSQLClient as any) : this.#config.client,
        connection: this.usesFileDatabase()
          ? { filename: (this.resolveConnectionNode() as { filename: string }).filename }
          : (this.getMaintenanceConnection() as Knex.Config['connection']),
        useNullAsDefault: true,
        debug: false,
      })
    }

    return this.#client
  }

  /**
   * Quotes the database name as per the dialect rules to avoid
   * SQL injection via the database name
   */
  private quoteIdentifier(name: string): string {
    if (MYSQL_CLIENTS.includes(this.#config.client)) {
      return '`' + name.replace(/`/g, '``') + '`'
    }

    if (this.#config.client === 'mssql') {
      return '[' + name.replace(/]/g, ']]') + ']'
    }

    return '"' + name.replace(/"/g, '""') + '"'
  }

  /**
   * Returns the database name (the file path for file backed databases)
   * resolved from the connection config
   */
  get databaseName(): string {
    const connection = this.resolveConnectionNode()

    if (typeof connection === 'string') {
      return new URL(connection).pathname.slice(1)
    }

    if (connection && 'filename' in connection && connection.filename) {
      return connection.filename.replace(/^file:/, '')
    }

    if (connection && 'database' in connection && connection.database) {
      return connection.database
    }

    if (connection && 'connectionString' in connection && connection.connectionString) {
      return new URL(connection.connectionString).pathname.slice(1)
    }

    throw new errors.E_MISSING_DATABASE_NAME([this.#config.client])
  }

  /**
   * Returns a boolean to know if the database already exists
   */
  async databaseExists(): Promise<boolean> {
    if (this.usesFileDatabase()) {
      return existsSync(this.fileDatabasePath())
    }

    const client = this.getClient()
    const databaseName = this.databaseName

    if (MYSQL_CLIENTS.includes(this.#config.client)) {
      const rows = await client
        .from('information_schema.schemata')
        .where('schema_name', databaseName)
      return rows.length > 0
    }

    if (this.#config.client === 'mssql') {
      const rows = await client.from('sys.databases').where('name', databaseName)
      return rows.length > 0
    }

    const rows = await client.from('pg_database').where('datname', databaseName)
    return rows.length > 0
  }

  /**
   * Creates the database. For file backed databases, the database
   * file is created (alongside missing intermediate directories)
   */
  async createDatabase(): Promise<void> {
    if (this.usesFileDatabase()) {
      await mkdir(dirname(this.fileDatabasePath()), { recursive: true })
      await this.getClient().raw('SELECT 1')
      return
    }

    await this.getClient().raw(`CREATE DATABASE ${this.quoteIdentifier(this.databaseName)}`)
  }

  /**
   * Drops the database. For file backed databases, the database
   * file is removed from the disk
   */
  async dropDatabase(): Promise<void> {
    if (this.usesFileDatabase()) {
      await this.disconnect()

      const filePath = this.fileDatabasePath()
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
      return
    }

    await this.getClient().raw(`DROP DATABASE ${this.quoteIdentifier(this.databaseName)}`)
  }

  /**
   * Closes the connection to the maintenance database. The instance
   * cannot be used after calling this method
   */
  async disconnect(): Promise<void> {
    if (this.#client) {
      await this.#client.destroy()
      this.#client = undefined
    }
  }
}
