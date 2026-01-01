/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { dirname } from 'node:path'
import { EventEmitter } from 'node:events'
import { writeFile, mkdir } from 'node:fs/promises'
import { type Application } from '@adonisjs/core/app'
import { RuntimeException } from '@adonisjs/core/exceptions'

import { OrmSchemaBuilder } from './builder.ts'
import type { Database } from '../../database/main.ts'
import { type QueryClientContract } from '../../types/database.ts'
import type { OrmSchemaGeneratorConfig, DatabaseColumn } from '../../types/schema_generator.ts'

/**
 * OrmSchemaGenerator orchestrates the process of generating TypeScript
 * model schemas from database tables.
 */
export class OrmSchemaGenerator extends EventEmitter<{
  /**
   * Emitted when tables are collected from the database
   */
  'collect:tables': [tables: string[]]

  /**
   * Emitted for each table with its column information
   */
  'table:info': [info: { tableName: string; columns: Record<string, DatabaseColumn> }]

  /**
   * Emitted when schema generation starts
   */
  'generating:schema': []
}> {
  /**
   * Schema builder instance
   */
  private builder: OrmSchemaBuilder

  /**
   * Query client instance
   */
  private connection: QueryClientContract

  constructor(
    private db: Database,
    private application: Application<any>,
    private config: OrmSchemaGeneratorConfig
  ) {
    super()
    const connectionName = this.config.connectionName || this.db.primaryConnectionName
    this.connection = this.db.connection(connectionName)
    this.builder = new OrmSchemaBuilder(this.connection)
  }

  /**
   * Load schema rules from the configured paths
   */
  private async loadSchemaRules(): Promise<void> {
    if (!this.config.rulesPaths || this.config.rulesPaths.length === 0) {
      return
    }

    try {
      const rules = await Promise.all(
        this.config.rulesPaths.map((rulesPath) => {
          return this.application.importDefault(rulesPath)
        })
      )
      this.builder.loadRules(rules)
    } catch (error) {
      throw new RuntimeException('Failed to load schema rules', {
        cause: error,
      })
    }
  }

  /**
   * Fetch all tables and their columns from the database
   */
  private async fetchTablesAndColumns(): Promise<
    Array<{ name: string; columns: Record<string, any> }>
  > {
    /**
     * Get list of all tables from the database
     */
    const tables = await this.connection.getAllTables(this.config.schemas)
    this.emit('collect:tables', tables)

    /**
     * Fetch columns for each table
     */
    const tablesWithColumns = await Promise.all(
      tables.map(async (tableName) => {
        const columns = await this.connection.columnsInfo(tableName)
        this.emit('table:info', { tableName, columns })
        return { name: tableName, columns }
      })
    )

    return tablesWithColumns
  }

  /**
   * Generate schemas and write to output file
   */
  async generate(): Promise<void> {
    /**
     * Load custom schema rules if provided
     */
    await this.loadSchemaRules()

    /**
     * Fetch all tables and columns
     */
    const tables = await this.fetchTablesAndColumns()

    /**
     * Generate schemas using the builder
     */
    this.emit('generating:schema')
    const schemas = this.builder.generateSchemas(tables)
    const output = this.builder.getOutput(schemas)

    /**
     * Write to output file
     */
    const outputDir = dirname(this.config.outputPath)
    await mkdir(outputDir, { recursive: true })
    await writeFile(this.config.outputPath, output, 'utf-8')
  }

  /**
   * Close database connections
   */
  async close() {
    await this.db.manager.closeAll(true)
  }
}
