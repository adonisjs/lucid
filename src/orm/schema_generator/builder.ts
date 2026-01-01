/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import merge from 'deepmerge'
import { ImportsBag } from '@poppinss/utils'
import stringHelpers from '@adonisjs/core/helpers/string'

import { DEFAULT_SCHEMA_RULES } from './rules.ts'
import { DATA_TYPES_MAPPING, INTERNAL_TYPES } from './mappings.ts'
import type {
  SchemaRules,
  DatabaseColumn,
  GeneratedColumn,
  GeneratedSchemas,
} from '../../types/schema_generator.ts'
import { type QueryClientContract } from '../../types/database.ts'

/**
 * OrmSchemaBuilder handles the core logic of generating TypeScript
 * model schemas from database table structures.
 */
export class OrmSchemaBuilder {
  /**
   * Schema rules for type mapping and customization
   */
  private schema: Required<SchemaRules> = DEFAULT_SCHEMA_RULES

  /**
   * Mapping from database types to internal type identifiers
   */
  private dataTypes: Record<string, string> = DATA_TYPES_MAPPING

  constructor(private client: QueryClientContract) {}

  /**
   * Load user-defined schema rules
   */
  loadRules(rules: SchemaRules[]): void {
    this.schema = merge.all<Required<SchemaRules>>([this.schema, ...rules])
  }

  /**
   * Generate schema for a single column
   */
  private generateColumnSchema(
    columnName: string,
    column: DatabaseColumn,
    tableName: string
  ): GeneratedColumn {
    const dialectColumnType = `${this.client.dialect.name}.${column.type}`
    // Map database type to internal type identifier
    // If no mapping exists, use the database type name itself
    const internalType =
      this.dataTypes[dialectColumnType] ?? this.dataTypes[column.type] ?? column.type

    // For unknown internal types, allow users to define custom rules using the database type name
    const typeLookupKey = internalType === INTERNAL_TYPES.UNKNOWN ? column.type : internalType

    // Lookup hierarchy (most specific to least specific):
    // 1. Table-specific column
    // 2. Table-specific type
    // 3. Global column name
    // 4. Global type
    const ruleDef =
      this.schema.tables[tableName]?.columns?.[columnName] ??
      this.schema.tables[tableName]?.types?.[typeLookupKey] ??
      this.schema.columns[columnName] ??
      this.schema.types[typeLookupKey]

    const rule = typeof ruleDef === 'function' ? ruleDef(typeLookupKey) : ruleDef

    // Default to 'any' type if no rule is defined
    const finalRule = rule ?? {
      tsType: 'any',
      imports: [],
      decorator: '@column()',
    }

    let tsType = finalRule.tsType
    let propertyName = stringHelpers.camelCase(columnName)

    if (column.nullable) {
      tsType += ' | null'
    }

    return {
      imports: finalRule.imports,
      propertyName,
      column: `  ${finalRule.decorator}\n  declare ${propertyName}: ${tsType}`,
    }
  }

  /**
   * Generate schema for a single table (internal method)
   */
  private generateTableSchema(
    tableName: string,
    columns: Record<string, DatabaseColumn>,
    importsBag: ImportsBag
  ): string {
    const schema = Object.keys(columns).map((columnName) => {
      const column = columns[columnName]
      return this.generateColumnSchema(columnName, column, tableName)
    })

    // Add column-specific imports
    schema.forEach((col) => {
      col.imports.forEach((imp) => importsBag.add(imp))
    })

    const className = stringHelpers.pascalCase(stringHelpers.singular(tableName))

    // Return complete class definition as a single string (compact format)
    return [
      `export class ${className}Schema extends BaseModel {`,
      `  static $columns = [${schema.map((k) => `'${k.propertyName}'`).join(', ')}] as const`,
      `  $columns = ${className}Schema.$columns`,
      schema.map((k) => k.column).join('\n'),
      '}',
    ].join('\n')
  }

  /**
   * Generate schemas for multiple tables
   */
  generateSchemas(
    tables: Array<{ name: string; columns: Record<string, DatabaseColumn> }>
  ): GeneratedSchemas {
    const importsBag = new ImportsBag()
    const classesToCreate: string[] = []

    // Add base import
    importsBag.add({ source: '@adonisjs/lucid/orm', namedImports: ['BaseModel', 'column'] })

    tables.forEach((table) => {
      const classDefinition = this.generateTableSchema(table.name, table.columns, importsBag)
      classesToCreate.push(classDefinition)
    })

    return {
      imports: importsBag.toArray(),
      classes: classesToCreate,
    }
  }

  /**
   * Get the final output string from generated schemas
   */
  getOutput(schemas: GeneratedSchemas): string {
    const importsBag = new ImportsBag()
    schemas.imports.forEach((imp) => importsBag.add(imp))

    return `${importsBag.toString()}\n\n${schemas.classes.join('\n\n')}\n`
  }
}
