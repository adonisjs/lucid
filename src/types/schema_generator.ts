/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type ImportInfo } from '@poppinss/utils'

/**
 * A structured decorator definition with name and optional arguments
 */
export type DecoratorInfo = {
  name: string
  args?: Record<string, any>
}

/**
 * Column information with TypeScript type, decorator, and imports
 */
export type ColumnInfo = {
  tsType: string

  /**
   * @deprecated Use `decorators` instead
   */
  decorator?: string

  /**
   * Structured decorator definitions. When defined, the `decorator`
   * property is ignored.
   */
  decorators?: DecoratorInfo[]

  imports?: ImportInfo[]
}

/**
 * Return value of the primaryKey rule. Identifies which column
 * is the primary key and how it should be represented.
 */
export type PrimaryKeyInfo = {
  columnName: string
  columnInfo: ColumnInfo
}

/**
 * A function that receives the table name, primary key column names
 * (from the database), and the full columns metadata. Returns which
 * column to mark as primary along with its decorator info.
 * Return undefined to skip primary key handling.
 */
export type PrimaryKeyRule = (
  tableName: string,
  primaryKeys: string[],
  columns: Record<string, DatabaseColumn>
) => PrimaryKeyInfo | undefined

/**
 * Schema rules that can be customized per type, column, or table
 */
export type SchemaRules = {
  types?: {
    [type: string]: ColumnInfo | ((dataType: string) => ColumnInfo)
  }
  columns?: {
    [column: string]: ColumnInfo | ((dataType: string) => ColumnInfo)
  }
  tables?: {
    [table: string]: {
      types?: {
        [type: string]: ColumnInfo | ((dataType: string) => ColumnInfo)
      }
      columns?: {
        [column: string]: ColumnInfo | ((dataType: string) => ColumnInfo)
      }
      skipColumns?: string[]
      primaryKey?: PrimaryKeyRule
    }
  }
  primaryKey?: PrimaryKeyRule
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
