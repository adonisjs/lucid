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
import { BaseCommand, flags } from '@adonisjs/core/ace'
import { type CommandOptions } from '@adonisjs/core/types/ace'
import { MigrationSource } from '../src/migration/source.js'
import { SchemaDumpManifestFile } from '../src/migration/schema_dump/manifest.js'
import { createSchemaState } from '../src/migration/schema_dump/schema_state.js'

/**
 * Dump the current database schema to a SQL file. The dump also embeds the
 * migrations bookkeeping tables, so that future runs can bootstrap from the
 * SQL snapshot and treat older migrations as already executed.
 */
export default class SchemaDump extends BaseCommand {
  static commandName = 'schema:dump'
  static description = 'Dump the database schema to a SQL file'
  static options: CommandOptions = {
    startApp: true,
  }

  /**
   * Custom connection for dumping the schema.
   */
  @flags.string({ description: 'Define a custom database connection', alias: 'c' })
  declare connection: string

  /**
   * Custom path for storing the generated SQL dump.
   */
  @flags.string({ description: 'Define a custom path for the schema dump' })
  declare path: string

  /**
   * Delete all migration files after creating the dump.
   */
  @flags.boolean({ description: 'Delete all migration files from configured migration paths' })
  declare prune: boolean

  /**
   * Display an invalid connection error using the same wording as the
   * rest of the migration commands.
   */
  private printNotAValidConnection(connection: string) {
    this.logger.error(
      `"${connection}" is not a valid connection name. Double check "config/database" file`
    )
  }

  /**
   * Returns the absolute output path for writing the SQL dump.
   */
  private getOutputPath() {
    const outputPath = this.path || SchemaDumpManifestFile.defaultDumpPath(this.connection)
    return isAbsolute(outputPath) ? outputPath : this.app.makePath(outputPath)
  }

  /**
   * Returns the display label used in logs and inside the manifest.
   */
  private getOutputLabel() {
    return this.path || SchemaDumpManifestFile.defaultDumpPath(this.connection)
  }

  /**
   * Returns the list of migrations already stored inside the schema table.
   * These names are persisted inside the manifest and later used to
   * distinguish pruned migrations from genuinely missing ones.
   */
  private async getSquashedMigrationNames(schemaTableName: string) {
    const db = await this.app.container.make('lucid.db')
    const client = db.connection(this.connection)

    if (!(await client.schema.hasTable(schemaTableName))) {
      return []
    }

    const rows = await client
      .query<{ name: string }>()
      .from(schemaTableName)
      .select('name')
      .orderBy('id', 'asc')
    return rows.map(({ name }) => name)
  }

  /**
   * Deletes every configured migration directory and recreates it immediately
   */
  private async pruneMigrationDirectories(migrationSource: MigrationSource) {
    const paths = migrationSource.getMigrationsPaths()

    const promises = paths.map(async (directoryPath) => {
      const absolutePath = isAbsolute(directoryPath)
        ? directoryPath
        : this.app.makePath(directoryPath)

      await rm(absolutePath, { recursive: true, force: true })
      await mkdir(absolutePath, { recursive: true })
    })

    await Promise.all(promises)
  }

  /**
   * Handle command execution.
   */
  async run() {
    const db = await this.app.container.make('lucid.db')
    this.connection = this.connection || db.primaryConnectionName

    /**
     * Ensure the requested connection exists before attempting to read
     * migration settings or instantiate a schema state.
     */
    const managerConnection = db.manager.get(this.connection)
    if (!managerConnection) {
      this.printNotAValidConnection(this.connection)
      this.exitCode = 1
      return
    }

    const schemaTableName = managerConnection.config.migrations?.tableName ?? 'adonis_schema'
    const schemaVersionsTableName = `${schemaTableName}_versions`
    const client = db.connection(this.connection)
    const migrationSource = new MigrationSource(managerConnection.config, this.app)
    const outputPath = this.getOutputPath()
    const outputLabel = this.getOutputLabel()
    const metaPath = SchemaDumpManifestFile.metaPath(outputPath)
    const metaLabel = SchemaDumpManifestFile.metaPath(outputLabel)

    try {
      /**
       * Dump the structural schema using the dialect-specific implementation.
       */
      const schemaState = createSchemaState(
        client,
        managerConnection.config,
        schemaTableName,
        schemaVersionsTableName
      )
      await schemaState.dump(outputPath)

      /**
       * Write the manifest after the dump succeeds, so that the `.sql` and
       * `.meta.json` files always describe the same snapshot.
       */
      await SchemaDumpManifestFile.create({
        connection: this.connection,
        dumpPath: outputLabel,
        schemaTableName,
        schemaVersionsTableName,
        squashedMigrationNames: await this.getSquashedMigrationNames(schemaTableName),
      }).write(metaPath)

      /**
       * Pruning is intentionally the last destructive step. If dumping fails,
       * migration files are left untouched.
       */
      if (this.prune) {
        await this.pruneMigrationDirectories(migrationSource)
      }

      this.logger.success(
        this.prune
          ? `Database schema dumped to "${outputLabel}" and migration files pruned`
          : `Database schema dumped to "${outputLabel}"`
      )
      this.logger.success(`Schema manifest written to "${metaLabel}"`)
    } catch (error) {
      this.exitCode = 1
      this.logger.error('Unable to dump database schema')
      this.logger.error(error)
    }
  }

  /**
   * Close database connections only when executed as the main command.
   */
  async completed() {
    if (this.isMain) {
      const db = await this.app.container.make('lucid.db')
      await db.manager.closeAll(true)
    }
  }
}
