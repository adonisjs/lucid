/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import {
  MigrationNode,
  MigratorOptions,
  MigratorContract,
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
export class Migrator implements MigratorContract {
  private _client = this._db.connection(this._options.connectionName)
  private _config = this._db.getRawConnection(this._client.connectionName)!.config

  /**
   * Reference to the migrations config for the given connection
   */
  private _migrationsConfig = {
    tableName: 'adonis_schema',
    disableTransactions: false,
    ...this._config.migrations,
  }

  private _booted: boolean = false

  /**
   * Migration source to collect schema files from the disk
   */
  private _migrationSource = new MigrationSource(this._config, this._app)

  /**
   * The latest batch in the database before we start the migrations
   */
  private _latestBatch?: number

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
  public migratedFiles: string[] = []

  /**
   * Copy of migrated queries, available only in dry run
   */
  public migratedQueries = {}

  /**
   * Current status of the migrator
   */
  public get status () {
    return !this._booted ? 'pending' : (this.migratedFiles.length ? 'completed' : 'skipped')
  }

  constructor (
    private _db: DatabaseContract,
    private _app: ApplicationContract,
    private _options: MigratorOptions,
  ) {
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
      this.migratedQueries[name] = executionResponse as string[]
      return
    }

    await client.insertQuery().table(this._migrationsConfig.tableName).insert({
      name,
      batch: this._latestBatch! + 1,
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
      this.migratedQueries[name] = executionResponse as string[]
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

      if (this.direction === 'up') {
        const response = await schema.execUp()  // Handles dry run itself
        await this._recordMigrated(client, migration.name, response) // Handles dry run itself
      } else if (this.direction === 'down') {
        const response = await schema.execDown() // Handles dry run itself
        await this._recordRollback(client, migration.name, response) // Handles dry run itself
      }

      await this._commit(client)
      this.migratedFiles.push(migration.name)
    } catch (error) {
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
   * Returns an array of files migrated till now
   */
  private async _getMigratedFilesTillBatch (batch) {
    const rows = await this._client
      .query<{ name: string }[]>()
      .from(this._migrationsConfig.tableName)
      .select('name')
      .where('batch', '>', batch)
      .orderBy('id', 'desc')

    return rows.map(({ name }) => name)
  }

  /**
   * Boot the migrator to perform actions. All boot methods must
   * work regardless of dryRun is enabled or not.
   */
  private async _boot () {
    this._booted = true
    await this._acquireLock()
    await this._makeMigrationsTable()
    this._latestBatch = await this._getLatestBatch()
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
    const existing = await this._getMigratedFiles()
    const collected = await this._migrationSource.getMigrations()

    for (let migration of collected) {
      /**
       * Only execute non migrated files
       */
      if (!existing.has(migration.name)) {
        await this._executeMigration(migration)
      }
    }
  }

  /**
   * Migrate down (aka rollback)
   */
  private async _runDown (batch: number) {
    const existing = await this._getMigratedFilesTillBatch(batch)
    const collected = await this._migrationSource.getMigrations()

    /**
     * Finding schema files for migrations to rollback. We do not perform
     * rollback when any of the files are missing
     */
    const migrations = existing.reduce((migrations: MigrationNode[], file) => {
      const migration = collected.find((migration) => migration.name === file)
      if (!migration) {
        throw new Exception(
          `Cannot perform rollback. Schema file {${file}} is missing`,
          500,
          'E_MISSING_SCHEMA_FILES',
        )
      }

      migrations.push(migration)
      return migrations
    }, [])

    for (let migration of migrations) {
      await this._executeMigration(migration)
    }
  }

  /**
   * Returns list of migrated files, along with their
   * batch
   */
  public async getList () {
    return this._client
      .query()
      .from(this._migrationsConfig.tableName)
      .select('name', 'batch', 'migration_time')
  }

  /**
   * Migrate the database by calling the up method
   */
  public async run () {
    await this._boot()

    if (this.direction === 'up') {
      await this._runUp()
    } else if (this._options.direction === 'down') {
      await this._runDown(this._options.batch)
    }

    await this._shutdown()
  }
}
