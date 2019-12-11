/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { EventEmitter } from 'events'
import { Exception } from '@poppinss/utils'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import {
  MigrationNode,
  MigratorOptions,
  MigratedFileNode,
  MigratorContract,
  MigrationListNode,
} from '@ioc:Adonis/Lucid/Migrator'

import {
  DatabaseContract,
  QueryClientContract,
  TransactionClientContract,
} from '@ioc:Adonis/Lucid/Database'

import { MigrationSource } from './MigrationSource'

/**
 * Migrator exposes the API to execute migrations using the schema files
 * for a given connection at a time.
 */
export class Migrator extends EventEmitter implements MigratorContract {
  private _client = this._db.connection(this._options.connectionName || this._db.primaryConnectionName)
  private _config = this._db.getRawConnection(this._client.connectionName)!.config

  /**
   * Reference to the migrations config for the given connection
   */
  private _migrationsConfig = Object.assign({
    tableName: 'adonis_schema',
    disableTransactions: false,
  }, this._config.migrations)

  /**
   * Whether or not the migrator has been booted
   */
  private _booted: boolean = false

  /**
   * Migration source to collect schema files from the disk
   */
  private _migrationSource = new MigrationSource(this._config, this._app)

  /**
   * Mode decides in which mode the migrator is executing migrations. The migrator
   * instance can only run in one mode at a time.
   *
   * The value is set when `migrate` or `rollback` method is invoked
   */
  public direction: 'up' | 'down' = this._options.direction

  /**
   * Instead of executing migrations, just return the generated SQL queries
   */
  public dryRun: boolean = !!this._options.dryRun

  /**
   * An array of files we have successfully migrated. The files are
   * collected regardless of `up` or `down` methods
   */
  public migratedFiles: { [file: string]: MigratedFileNode } = {}

  /**
   * Last error occurred when executing migrations
   */
  public error: null | Error = null

  /**
   * Current status of the migrator
   */
  public get status () {
    return !this._booted
      ? 'pending'
      : (
        this.error
          ? 'error'
          : (Object.keys(this.migratedFiles).length ? 'completed' : 'skipped')
      )
  }

  constructor (
    private _db: DatabaseContract,
    private _app: ApplicationContract,
    private _options: MigratorOptions,
  ) {
    super()
  }

  /**
   * Returns the client for a given schema file. Schema instructions are
   * wrapped in a transaction unless transaction is not disabled
   */
  private async _getClient (disableTransactions: boolean) {
    /**
     * We do not create a transaction when
     *
     * 1. Migration itself disables transaction
     * 2. Transactions are globally disabled
     * 3. Doing a dry run
     */
    if (
      disableTransactions ||
      this._migrationsConfig.disableTransactions ||
      this.dryRun
    ) {
      return this._client
    }

    return this._client.transaction()
  }

  /**
   * Roll back the transaction when it's client is a transaction client
   */
  private async _rollback (client: QueryClientContract) {
    if (client.isTransaction) {
      await (client as TransactionClientContract).rollback()
    }
  }

  /**
   * Commits a transaction when it's client is a transaction client
   */
  private async _commit (client: QueryClientContract) {
    if (client.isTransaction) {
      await (client as TransactionClientContract).commit()
    }
  }

  /**
   * Writes the migrated file to the migrations table. This ensures that
   * we are not re-running the same migration again
   */
  private async _recordMigrated (
    client: QueryClientContract,
    name: string,
    executionResponse: boolean | string[],
  ) {
    if (this.dryRun) {
      this.migratedFiles[name].queries = executionResponse as string[]
      return
    }

    await client.insertQuery().table(this._migrationsConfig.tableName).insert({
      name,
      batch: this.migratedFiles[name].batch,
    })
  }

  /**
   * Removes the migrated file from the migrations table. This allows re-running
   * the migration
   */
  private async _recordRollback (
    client: QueryClientContract,
    name: string,
    executionResponse: boolean | string[],
  ) {
    if (this.dryRun) {
      this.migratedFiles[name].queries = executionResponse as string[]
      return
    }

    await client.query().from(this._migrationsConfig.tableName).where({ name }).del()
  }

  /**
   * Executes a given migration node and cleans up any created transactions
   * in case of failure
   */
  private async _executeMigration (migration: MigrationNode) {
    const client = await this._getClient(migration.source.disableTransactions)

    try {
      const schema = new migration.source(client, migration.name, this.dryRun)
      this.emit('migration:start', this.migratedFiles[migration.name])

      if (this.direction === 'up') {
        const response = await schema.execUp() // Handles dry run itself
        await this._recordMigrated(client, migration.name, response) // Handles dry run itself
      } else if (this.direction === 'down') {
        const response = await schema.execDown() // Handles dry run itself
        await this._recordRollback(client, migration.name, response) // Handles dry run itself
      }

      await this._commit(client)
      this.migratedFiles[migration.name].status = 'completed'
      this.emit('migration:completed', this.migratedFiles[migration.name])
    } catch (error) {
      this.error = error
      this.migratedFiles[migration.name].status = 'error'
      this.emit('migration:error', this.migratedFiles[migration.name])

      await this._rollback(client)
      throw error
    }
  }

  /**
   * Acquires a lock to disallow concurrent transactions. Only works with
   * `Mysql`, `PostgreSQL` and `MariaDb` for now.
   *
   * Make sure we are acquiring lock outside the transactions, since we want
   * to block other processes from acquiring the same lock.
   *
   * Locks are always acquired in dry run too, since we want to stay close
   * to the real execution cycle
   */
  private async _acquireLock () {
    if (!this._client.dialect.supportsAdvisoryLocks) {
      return
    }

    const acquired = await this._client.dialect.getAdvisoryLock(1)
    if (!acquired) {
      throw new Exception('Unable to acquire lock. Concurrent migrations are not allowed')
    }
    this.emit('acquire:lock')
  }

  /**
   * Release a lock once complete the migration process. Only works with
   * `Mysql`, `PostgreSQL` and `MariaDb` for now.
   */
  private async _releaseLock () {
    if (!this._client.dialect.supportsAdvisoryLocks) {
      return
    }

    const released = await this._client.dialect.releaseAdvisoryLock(1)
    if (!released) {
      throw new Exception('Migration completed, but unable to release database lock')
    }
    this.emit('release:lock')
  }

  /**
   * Makes the migrations table (if missing). Also created in dry run, since
   * we always reads from the schema table to find which migrations files to
   * execute and that cannot done without missing table.
   */
  private async _makeMigrationsTable () {
    const client = this._client

    const hasTable = await client.schema.hasTable(this._migrationsConfig.tableName)
    if (hasTable) {
      return
    }

    this.emit('create:schema:table')
    await client.schema.createTable(this._migrationsConfig.tableName, (table) => {
      table.increments().notNullable()
      table.string('name').notNullable()
      table.integer('batch').notNullable()
      table.timestamp('migration_time').defaultTo(client.getWriteClient().fn.now())
    })
  }

  /**
   * Returns the latest batch from the migrations
   * table
   */
  private async _getLatestBatch () {
    const rows = await this._client
      .from(this._migrationsConfig.tableName)
      .max('batch as batch')

    return Number(rows[0].batch)
  }

  /**
   * Returns an array of files migrated till now
   */
  private async _getMigratedFiles () {
    const rows = await this._client
      .query<{ name: string }[]>()
      .from(this._migrationsConfig.tableName)
      .select('name')

    return new Set(rows.map(({ name }) => name))
  }

  /**
   * Returns an array of files migrated till now. The latest
   * migrations are on top
   */
  private async _getMigratedFilesTillBatch (batch: number) {
    return this._client
      .query<{ name: string, batch: number, migration_time: Date }[]>()
      .from(this._migrationsConfig.tableName)
      .select('name', 'batch', 'migration_time')
      .where('batch', '>', batch)
      .orderBy('id', 'desc')
  }

  /**
   * Boot the migrator to perform actions. All boot methods must
   * work regardless of dryRun is enabled or not.
   */
  private async _boot () {
    this.emit('start')
    this._booted = true
    await this._acquireLock()
    await this._makeMigrationsTable()
  }

  /**
   * Shutdown gracefully
   */
  private async _shutdown () {
    await this._releaseLock()
  }

  /**
   * Migrate up
   */
  private async _runUp () {
    const batch = await this._getLatestBatch()
    const existing = await this._getMigratedFiles()
    const collected = await this._migrationSource.getMigrations()

    /**
     * Upfront collecting the files to be executed
     */
    collected.forEach((migration) => {
      if (!existing.has(migration.name)) {
        this.migratedFiles[migration.name] = {
          status: 'pending',
          queries: [],
          migration: migration,
          batch: batch + 1,
        }
      }
    })

    const filesToMigrate = Object.keys(this.migratedFiles)
    for (let name of filesToMigrate) {
      await this._executeMigration(this.migratedFiles[name].migration)
    }
  }

  /**
   * Migrate down (aka rollback)
   */
  private async _runDown (batch?: number) {
    if (batch === undefined) {
      batch = await this._getLatestBatch() - 1
    }

    const existing = await this._getMigratedFilesTillBatch(batch)
    const collected = await this._migrationSource.getMigrations()

    /**
     * Finding schema files for migrations to rollback. We do not perform
     * rollback when any of the files are missing
     */
    existing.forEach((file) => {
      const migration = collected.find(({ name }) => name === file.name)
      if (!migration) {
        throw new Exception(
          `Cannot perform rollback. Schema file {${file.name}} is missing`,
          500,
          'E_MISSING_SCHEMA_FILES',
        )
      }

      this.migratedFiles[migration.name] = {
        status: 'pending',
        queries: [],
        migration: migration,
        batch: file.batch,
      }
    })

    const filesToMigrate = Object.keys(this.migratedFiles)
    for (let name of filesToMigrate) {
      await this._executeMigration(this.migratedFiles[name].migration)
    }
  }

  public on (event: 'start', callback: () => void): this
  public on (event: 'acquire:lock', callback: () => void): this
  public on (event: 'release:lock', callback: () => void): this
  public on (event: 'create:schema:table', callback: () => void): this
  public on (event: 'migration:start', callback: (file: MigratedFileNode) => void): this
  public on (event: 'migration:completed', callback: (file: MigratedFileNode) => void): this
  public on (event: 'migration:error', callback: (file: MigratedFileNode) => void): this
  public on (event: string, callback: (...args: any[]) => void): this {
    return super.on(event, callback)
  }

  /**
   * Returns a merged list of completed and pending migrations
   */
  public async getList (): Promise<MigrationListNode[]> {
    const existingCollected: Set<string> = new Set()
    const existing = await this._getMigratedFilesTillBatch(0)
    const collected = await this._migrationSource.getMigrations()

    const list: MigrationListNode[] = collected.map((migration) => {
      const migrated = existing.find(({ name }) => migration.name === name)

      /**
       * Already migrated. We move to an additional list, so that we can later
       * find the one's which are migrated but now missing on the disk
       */
      if (migrated) {
        existingCollected.add(migrated.name)
        return {
          name: migration.name,
          batch: migrated.batch,
          status: 'migrated',
          migrationTime: migrated.migration_time,
        }
      }

      return {
        name: migration.name,
        status: 'pending',
      }
    })

    /**
     * These are the one's which were migrated earlier, but now missing
     * on the disk
     */
    existing.forEach(({ name, batch, migration_time }) => {
      if (!existingCollected.has(name)) {
        list.push({ name, batch, migrationTime: migration_time, status: 'corrupt' })
      }
    })

    return list
  }

  /**
   * Migrate the database by calling the up method
   */
  public async run () {
    try {
      await this._boot()

      if (this.direction === 'up') {
        await this._runUp()
      } else if (this._options.direction === 'down') {
        await this._runDown(this._options.batch)
      }
    } catch (error) {
      this.error = error
    }

    await this._shutdown()
  }

  /**
   * Close database connections
   */
  public async close () {
    await this._db.manager.closeAll(true)
  }
}
