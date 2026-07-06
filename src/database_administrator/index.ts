/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import knex, { type Knex } from 'knex'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { mkdir, unlink } from 'node:fs/promises'
// @ts-expect-error
import { resolveClientNameWithAliases } from 'knex/lib/util/helpers.js'

import * as errors from '../errors.js'
import LibSQLClient from '../clients/libsql.cjs'
import { clientsToDialectsMapping } from '../dialects/index.js'
import type { ConnectionConfig, DialectAdministrationContract } from '../types/database.js'

/**
 * Database administrator performs database level operations like creating
 * or dropping a database.
 *
 * Since the database in question may not exist yet, we cannot use the
 * regular lucid connections that are bound to the database defined
 * inside the config file. Instead, we create a standalone knex
 * connection to the maintenance database of the dialect and
 * delegate the dialect specific bits to the dialect
 * "administration" implementation.
 */
export class DatabaseAdministrator {
  #config: ConnectionConfig

  /**
   * Dialect specific implementation of the administration operations
   */
  #administration: DialectAdministrationContract

  /**
   * Reference to knex. The instance is lazily created when performing
   * the first database level operation
   */
  #client?: Knex

  constructor(config: ConnectionConfig) {
    const clientName = resolveClientNameWithAliases(
      config.client
    ) as keyof typeof clientsToDialectsMapping

    const administration = clientsToDialectsMapping[clientName]?.administration
    if (!administration) {
      throw new errors.E_UNSUPPORTED_DB_ADMINISTRATION([config.client])
    }

    this.#config = config
    this.#administration = administration
  }

  /**
   * A boolean to know if the connection uses a file backed
   * database like sqlite or libsql
   */
  private usesFileDatabase(): boolean {
    return this.#administration.usesFileDatabase === true
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
    if (this.#administration.usesFileDatabase) {
      return this.resolveConnectionNode()
    }

    const connection = this.resolveConnectionNode()
    const { maintenanceDatabase } = this.#administration

    if (typeof connection === 'string') {
      const url = new URL(connection)
      url.pathname = maintenanceDatabase ? `/${maintenanceDatabase}` : '/'
      return url.toString()
    }

    return Object.assign({}, connection, { database: maintenanceDatabase ?? undefined })
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
        /**
         * Debug is disabled like lucid does for its own knex instances,
         * since this standalone connection does not go through the
         * QueryClient instrumentation emitting "db:query" events
         */
        debug: false,
      })
    }

    return this.#client
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
    if (this.#administration.usesFileDatabase) {
      return existsSync(this.fileDatabasePath())
    }

    return this.#administration.databaseExists(this.getClient(), this.databaseName)
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

    const client = this.getClient()
    await client.raw(`CREATE DATABASE ${client.ref(this.databaseName).toSQL().sql}`)
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

    const client = this.getClient()
    await client.raw(`DROP DATABASE ${client.ref(this.databaseName).toSQL().sql}`)
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
