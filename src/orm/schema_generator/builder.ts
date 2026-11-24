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
import { RuntimeException } from '@adonisjs/core/exceptions'

import { DEFAULT_SCHEMA_RULES } from './rules.ts'
import { DATA_TYPES_MAPPING, INTERNAL_TYPES } from './mappings.ts'
import type {
  BaseModelInfo,
  ColumnInfo,
  DecoratorInfo,
  TableRules,
  SchemaRules,
  DatabaseTable,
  DatabaseColumn,
  GeneratedColumn,
  GeneratedSchemas,
} from '../../types/schema_generator.ts'
import { type QueryClientContract } from '../../types/database.ts'

/**
 * The schema of a table that a query uses when the table name has no
 * schema, for each dialect with schemas
 */
const DEFAULT_SCHEMAS: Record<string, string> = {
  postgres: 'public',
  redshift: 'public',
  mssql: 'dbo',
}

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
    this.schema = merge.all<Required<SchemaRules>>([this.schema, ...rules], {
      arrayMerge: (_target, source) => source,
      isMergeableObject: (value) => {
        if (!value || typeof value !== 'object') return false
        /**
         * ColumnInfo objects (identified by having `tsType`) should be
         * replaced entirely, not deep merged. This prevents default
         * decorators/imports from leaking into user-defined rules.
         */
        if ('tsType' in value) return false
        const tag = Object.prototype.toString.call(value)
        return tag !== '[object RegExp]' && tag !== '[object Date]'
      },
    })
  }

  /**
   * Returns true when the table is in the default schema of the
   * dialect, or when the dialect has no schemas
   */
  private isInDefaultSchema(table: DatabaseTable): boolean {
    return !table.schema || table.schema === DEFAULT_SCHEMAS[this.client.dialect.name]
  }

  /**
   * Returns the table name with its schema, when the table has one
   */
  private getQualifiedName(table: DatabaseTable): string {
    return table.schema ? `${table.schema}.${table.name}` : table.name
  }

  /**
   * Returns the "tables" rules of the table. The rules of
   * "<schema>.<table>" come first, so that they win over the
   * rules of the table name.
   */
  private getTableRules(table: DatabaseTable): TableRules[] {
    const rules: TableRules[] = []
    if (table.schema && this.schema.tables[this.getQualifiedName(table)]) {
      rules.push(this.schema.tables[this.getQualifiedName(table)])
    }
    if (this.schema.tables[table.name]) {
      rules.push(this.schema.tables[table.name])
    }
    return rules
  }

  /**
   * Returns the class name of each table, in the order of the tables.
   *
   * The first pass collects the class names of the tables in the default
   * schema. The second pass prefixes the class of a table of another
   * schema with its schema name, when a table of the default schema or
   * another table outside the default schema gives the same class name.
   * A class name that is already taken raises an exception, because the
   * output file would declare the same class twice.
   */
  private getClassNames(tables: DatabaseTable[]): string[] {
    const classNames: string[] = []
    const tableByClassName = new Map<string, string>()

    const getBaseName = (table: DatabaseTable) => {
      return `${stringHelpers.pascalCase(stringHelpers.singular(table.name))}Schema`
    }
    const addClassName = (index: number, className: string) => {
      const tableName = this.getQualifiedName(tables[index])
      const otherTableName = tableByClassName.get(className)
      if (otherTableName) {
        throw new RuntimeException(
          `Cannot generate schema classes, because the tables "${otherTableName}" and "${tableName}" give the same class name "${className}". Exclude one of the tables with "excludeTables", or rename it`
        )
      }
      tableByClassName.set(className, tableName)
      classNames[index] = className
    }

    tables.forEach((table, index) => {
      if (this.isInDefaultSchema(table)) {
        addClassName(index, getBaseName(table))
      }
    })

    const defaultSchemaClassNames = new Set(tableByClassName.keys())
    const otherSchemaCounts = new Map<string, number>()
    tables.forEach((table) => {
      if (!this.isInDefaultSchema(table)) {
        const baseName = getBaseName(table)
        otherSchemaCounts.set(baseName, (otherSchemaCounts.get(baseName) ?? 0) + 1)
      }
    })

    tables.forEach((table, index) => {
      if (this.isInDefaultSchema(table)) {
        return
      }
      const baseName = getBaseName(table)
      const collides = defaultSchemaClassNames.has(baseName) || otherSchemaCounts.get(baseName)! > 1
      addClassName(
        index,
        collides ? `${stringHelpers.pascalCase(table.schema!)}${baseName}` : baseName
      )
    })

    return classNames
  }

  /**
   * Serialize a decorator argument value to a TypeScript-safe string
   */
  private serializeArgValue(value: any): string {
    if (value === null) {
      return 'null'
    }
    if (typeof value === 'string') {
      return `'${value}'`
    }
    return String(value)
  }

  /**
   * Build a decorator string from a structured DecoratorInfo
   */
  private buildDecorator(decorator: DecoratorInfo): string {
    if (!decorator.args || Object.keys(decorator.args).length === 0) {
      return `${decorator.name}()`
    }

    const argEntries = Object.entries(decorator.args)
      .map(([key, value]) => `${key}: ${this.serializeArgValue(value)}`)
      .join(', ')
    return `${decorator.name}({ ${argEntries} })`
  }

  /**
   * Build decorator strings from a ColumnInfo. Supports both the
   * new `decorators` array and the deprecated `decorator` string.
   */
  private buildDecorators(rule: ColumnInfo, extraColumnArgs?: Record<string, any>): string {
    /**
     * New structured path: build from decorators array
     */
    if (rule.decorators) {
      return rule.decorators
        .map((dec) => {
          /**
           * Merge extra column args (like columnName) into decorators
           * that start with `@column`
           */
          if (extraColumnArgs && dec.name.startsWith('@column')) {
            return this.buildDecorator({
              name: dec.name,
              args: { ...extraColumnArgs, ...dec.args },
            })
          }
          return this.buildDecorator(dec)
        })
        .join('\n  ')
    }

    /**
     * Deprecated path: use the decorator string as-is
     */
    return rule.decorator ?? '@column()'
  }

  /**
   * Generate schema for a single column
   */
  private generateColumnSchema(
    columnName: string,
    column: DatabaseColumn,
    tableRules: TableRules[],
    primaryKeys: string[],
    primaryKeyColumnInfo: ColumnInfo | undefined
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
    // 4. Primary key rule (when this column is the primary key)
    // 5. Global type
    //
    // Steps 1 and 2 run for the "<schema>.<table>" rules first, and
    // then for the rules of the table name.
    let tableRuleDef: ColumnInfo | ((dataType: string) => ColumnInfo) | undefined
    for (const rules of tableRules) {
      tableRuleDef = rules.columns?.[columnName] ?? rules.types?.[typeLookupKey]
      if (tableRuleDef) {
        break
      }
    }

    const ruleDef =
      tableRuleDef ??
      this.schema.columns[columnName] ??
      primaryKeyColumnInfo ??
      this.schema.types[typeLookupKey]

    const rule = typeof ruleDef === 'function' ? ruleDef(typeLookupKey) : ruleDef

    // Default to 'any' type if no rule is defined
    const finalRule = rule ?? {
      tsType: 'any',
      imports: [],
      decorators: [{ name: '@column' }],
    }

    let tsType = finalRule.tsType
    let propertyName = stringHelpers.camelCase(columnName)
    let extraColumnArgs: Record<string, any> | undefined

    /**
     * When the property name is not a valid JS identifier and the rule
     * uses the structured `decorators` array, prefix it with an
     * underscore and set an explicit columnName so Lucid maps it
     * back to the correct database column.
     */
    if (/^[^a-zA-Z_$]/.test(propertyName) && finalRule.decorators) {
      propertyName = `_${propertyName}`
      extraColumnArgs = { columnName }
    } else if (finalRule.decorators && stringHelpers.snakeCase(propertyName) !== columnName) {
      /**
       * When converting the property name back to snake_case does not
       * reproduce the original database column name (e.g. the column
       * "player1_id" becomes the property "player1Id", which the naming
       * strategy would map back to "player_1_id"), set an explicit
       * columnName so Lucid always targets the correct database column
       * regardless of how snake_case handles digits.
       */
      extraColumnArgs = { columnName }
    }

    if (column.nullable && !primaryKeys.includes(columnName)) {
      tsType += ' | null'
    }

    const decorators = this.buildDecorators(finalRule, extraColumnArgs)

    return {
      imports: finalRule.imports ?? [],
      propertyName,
      column: `  ${decorators}\n  declare ${propertyName}: ${tsType}`,
    }
  }

  /**
   * Returns the base model of the table, from the table rules
   * or the global rules
   */
  private getBaseModel(table: DatabaseTable): BaseModelInfo {
    const tableRules = this.getTableRules(table)
    return tableRules.find((rules) => rules.baseModel)?.baseModel ?? this.schema.baseModel
  }

  /**
   * Generate schema for a single table (internal method)
   */
  private generateTableSchema(
    table: DatabaseTable,
    className: string,
    baseModel: BaseModelInfo,
    importsBag: ImportsBag
  ): string {
    const { columns, primaryKeys } = table
    const tableRules = this.getTableRules(table)

    /**
     * Resolve the primary key using table-specific or global primaryKey rule
     */
    const primaryKeyRule =
      tableRules.find((rules) => rules.primaryKey)?.primaryKey ?? this.schema.primaryKey
    const primaryKeyResult = primaryKeyRule?.(table.name, primaryKeys, columns)

    const skipColumns = tableRules.find((rules) => rules.skipColumns)?.skipColumns ?? []
    const columnNames = Object.keys(columns)
      .filter((columnName) => !skipColumns.includes(columnName))
      .sort((a, b) => a.localeCompare(b))
    const schema = columnNames.map((columnName) => {
      const column = columns[columnName]
      const pkInfo =
        primaryKeyResult && columnName === primaryKeyResult.columnName
          ? primaryKeyResult.columnInfo
          : undefined
      return this.generateColumnSchema(columnName, column, tableRules, primaryKeys, pkInfo)
    })

    // Add column-specific imports
    schema.forEach((col) => {
      col.imports.forEach((imp) => importsBag.add(imp))
    })

    // Return complete class definition as a single string (compact format)
    return [
      `export class ${className} extends ${baseModel.name} {`,
      `  static $columns = [${schema.map((k) => `'${k.propertyName}'`).join(', ')}] as const`,
      `  $columns = ${className}.$columns`,
      schema.map((k) => k.column).join('\n'),
      '}',
    ].join('\n')
  }

  /**
   * Generate schemas for multiple tables
   */
  generateSchemas(tables: DatabaseTable[]): GeneratedSchemas {
    const importsBag = new ImportsBag()
    const classesToCreate: string[] = []
    const classNames = this.getClassNames(tables)

    const baseModels = tables.map((table) => this.getBaseModel(table))

    // Add the imports of the base models and the column decorator
    baseModels.forEach(({ name, source }) => importsBag.add({ source, namedImports: [name] }))
    importsBag.add({ source: '@adonisjs/lucid/orm', namedImports: ['column'] })

    tables.forEach((table, index) => {
      classesToCreate.push(
        this.generateTableSchema(table, classNames[index], baseModels[index], importsBag)
      )
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
