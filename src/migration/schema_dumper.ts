/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { isAbsolute } from 'node:path'
import { mkdir, rm } from 'node:fs/promises'
import { EventEmitter } from 'node:events'
import { type Application } from '@adonisjs/core/app'

import { MigrationSource } from './source.js'
import { type Database } from '../database/main.js'
import { type SchemaDumperOptions } from '../types/migrator.js'
import { type ConnectionConfig, type QueryClientContract } from '../types/database.js'
import { SchemaDumpManifestFile } from './schema_dump/manifest.js'
import { createSchemaState } from './schema_dump/schema_state.js'

/**
 * SchemaDumper provides a code-level API for dumping the current database
 * schema to a SQL file. Commands are simply one interface for interacting
 * with this class.
 */
export class SchemaDumper extends EventEmitter {
  #db: Database
  #app: Application<any>
  #options: SchemaDumperOptions
  #client: QueryClientContract
  #config: ConnectionConfig
  #connectionName: string

  /**
   * Table names for storing schema files and schema versions
   */
  #schemaTableName: string
  #schemaVersionsTableName: string

  /**
   * Migration source to collect schema files from the disk
   */
  #migrationSource: MigrationSource

  /**
   * Whether the dumper has been executed
   */
  #executed = false

  /**
   * Last error occurred when executing the dump
   */
  error: null | Error = null

  /**
   * Result of the dump operation, available after a successful run
   */
  result: { dumpLabel: string; metaLabel: string; pruned: boolean } | null = null

  /**
   * Current status of the dumper
   */
  get status(): 'pending' | 'completed' | 'error' {
    if (!this.#executed) return 'pending'
    return this.error ? 'error' : 'completed'
  }

  constructor(db: Database, app: Application<any>, options: SchemaDumperOptions) {
    super()
    this.#db = db
    this.#app = app
    this.#options = options
    this.#connectionName = options.connectionName || db.primaryConnectionName
    this.#client = db.connection(this.#connectionName)
    this.#config = db.getRawConnection(this.#connectionName)!.config
    this.#schemaTableName = this.#config.migrations?.tableName ?? 'adonis_schema'
    this.#schemaVersionsTableName = `${this.#schemaTableName}_versions`
    this.#migrationSource = new MigrationSource(this.#config, app)
  }

  /**
   * Returns the absolute output path for writing the SQL dump
   */
  #getOutputPath() {
    const outputPath =
      this.#options.outputPath || SchemaDumpManifestFile.defaultDumpPath(this.#connectionName)
    return isAbsolute(outputPath) ? outputPath : this.#app.makePath(outputPath)
  }

  /**
   * Returns the display label used in logs and inside the manifest
   */
  #getOutputLabel() {
    return this.#options.outputPath || SchemaDumpManifestFile.defaultDumpPath(this.#connectionName)
  }

  /**
   * Returns the list of migrations already stored inside the schema table.
   * These names are persisted inside the manifest and later used to
   * distinguish pruned migrations from genuinely missing ones.
   */
  async #getSquashedMigrationNames() {
    if (!(await this.#client.schema.hasTable(this.#schemaTableName))) return []

    const rows = await this.#client
      .query<{ name: string }>()
      .from(this.#schemaTableName)
      .select('name')
      .orderBy('id', 'asc')

    return rows.map(({ name }) => name)
  }

  /**
   * Deletes every configured migration directory and recreates it
   * immediately so the folder structure is preserved.
   */
  async #pruneMigrationDirectories() {
    const paths = this.#migrationSource.getMigrationsPaths()

    const promises = paths.map(async (directoryPath) => {
      const absolutePath = isAbsolute(directoryPath)
        ? directoryPath
        : this.#app.makePath(directoryPath)

      await rm(absolutePath, { recursive: true, force: true })
      await mkdir(absolutePath, { recursive: true })
    })

    await Promise.all(promises)
  }

  /**
   * Dumps the structural schema using the dialect-specific implementation
   */
  async #dumpSchema(outputPath: string) {
    const schemaState = createSchemaState(
      this.#client,
      this.#config,
      this.#schemaTableName,
      this.#schemaVersionsTableName
    )
    await schemaState.dump(outputPath)
  }

  /**
   * Writes the sidecar manifest after the dump succeeds, so that the
   * `.sql` and `.meta.json` files always describe the same snapshot.
   */
  async #writeManifest(options: { metaPath: string; outputLabel: string }) {
    await SchemaDumpManifestFile.create({
      connection: this.#connectionName,
      dumpPath: options.outputLabel,
      schemaTableName: this.#schemaTableName,
      schemaVersionsTableName: this.#schemaVersionsTableName,
      squashedMigrationNames: await this.#getSquashedMigrationNames(),
    }).write(options.metaPath)
  }

  on(event: 'start', callback: () => void): this
  on(event: 'end', callback: () => void): this
  on(event: string, callback: (...args: any[]) => void): this {
    return super.on(event, callback)
  }

  /**
   * Execute the schema dump. Dumps the database schema to a SQL file,
   * writes the sidecar manifest, and optionally prunes migration
   * directories.
   */
  async run() {
    if (this.#executed) return

    this.emit('start')

    const outputPath = this.#getOutputPath()
    const outputLabel = this.#getOutputLabel()
    const metaPath = SchemaDumpManifestFile.metaPath(outputPath)

    try {
      await this.#dumpSchema(outputPath)
      await this.#writeManifest({ metaPath, outputLabel })

      if (this.#options.prune) {
        await this.#pruneMigrationDirectories()
      }

      const metaLabel = SchemaDumpManifestFile.metaPath(outputLabel)
      this.result = { dumpLabel: outputLabel, metaLabel, pruned: !!this.#options.prune }
    } catch (error) {
      this.error = error as Error
    }

    this.#executed = true
    this.emit('end')
  }

  /**
   * Close database connections
   */
  async close() {
    await this.#db.manager.closeAll(true)
  }
}
