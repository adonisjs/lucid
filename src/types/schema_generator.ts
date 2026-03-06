/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type ImportInfo } from '@poppinss/utils'

type Arrayable<T> = T | T[]

/**
 * Column information with TypeScript type, decorator, and imports
 */
export type ColumnInfo = {
  tsType: string
  decorator: Arrayable<string>
  imports?: ImportInfo[]
}

/**
 * Schema rules that can be customized per type, column, or table
 */
export type SchemaRules = {
  types?: {
    [type: string]: ColumnInfo | ((dataType: string, column: DatabaseColumn) => ColumnInfo)
  }
  columns?: {
    [column: string]: ColumnInfo | ((dataType: string, column: DatabaseColumn) => ColumnInfo)
  }
  tables?: {
    [table: string]: {
      types?: {
        [type: string]: ColumnInfo | ((dataType: string, column: DatabaseColumn) => ColumnInfo)
      }
      columns?: {
        [column: string]: ColumnInfo | ((dataType: string, column: DatabaseColumn) => ColumnInfo)
      }
    }
  }
}

/**
 * Database column metadata from Knex
 */
export type DatabaseColumn = {
  type: string
  nullable: boolean
  defaultValue?: any
  maxLength?: number | null
}

/**
 * Generated column schema
 */
export type GeneratedColumn = {
  imports: ImportInfo[]
  propertyName: string
  column: string
}

/**
 * Collection of generated schemas
 */
export type GeneratedSchemas = {
  imports: ImportInfo[]
  classes: string[]
}

/**
 * Configuration for OrmSchemaGenerator
 */
export type OrmSchemaGeneratorConfig = {
  /**
   * Enable or disable schema generation.
   * When set to false, the schema:generate command and automatic generation
   * after migrations will be skipped.
   * @default true
   */
  enabled?: boolean

  /**
   * Connection name to use for fetching table information
   */
  connectionName?: string

  excludeTables?: string[]

  schemas?: string[]

  /**
   * Path to the output file where schemas will be written
   */
  outputPath: string

  /**
   * Optional paths to schema rules files (JavaScript modules)
   * These will be imported and merged with default rules
   */
  rulesPaths?: string[]
}
