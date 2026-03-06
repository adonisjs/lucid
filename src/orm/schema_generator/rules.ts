/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { INTERNAL_TYPES, DATA_TYPES_MAPPING } from './mappings.ts'
import type { SchemaRules, DatabaseColumn } from '../../types/schema_generator.ts'

/**
 * Default schema rules for mapping internal types to TypeScript types
 */
export const DEFAULT_SCHEMA_RULES: Required<SchemaRules> = {
  types: {
    [INTERNAL_TYPES.NUMBER]: {
      tsType: 'number',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.BIGINT]: {
      tsType: 'bigint | number',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.DECIMAL]: {
      tsType: 'string',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.BOOLEAN]: {
      tsType: 'boolean',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.STRING]: {
      tsType: 'string',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.DATE]: {
      tsType: 'DateTime',
      imports: [{ source: 'luxon', namedImports: ['DateTime'] }],
      decorator: '@column.date()',
    },
    [INTERNAL_TYPES.TIME]: {
      tsType: 'string',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.BINARY]: {
      tsType: 'Buffer',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.JSON]: {
      tsType: 'any',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.JSONB]: {
      tsType: 'any',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.DATE_TIME]: {
      tsType: 'DateTime',
      imports: [{ source: 'luxon', namedImports: ['DateTime'] }],
      decorator: '@column.dateTime()',
    },
    [INTERNAL_TYPES.UUID]: {
      tsType: 'string',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.ENUM]: {
      tsType: 'string',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.SET]: {
      tsType: 'string',
      imports: [],
      decorator: '@column()',
    },
    [INTERNAL_TYPES.UNKNOWN]: {
      tsType: 'any',
      imports: [],
      decorator: '@column()',
    },
  },
  columns: {
    password: {
      tsType: 'string',
      imports: [],
      decorator: '@column({ serializeAs: null })',
    },
    created_at: {
      tsType: 'DateTime',
      imports: [{ source: 'luxon', namedImports: ['DateTime'] }],
      decorator: '@column.dateTime({ autoCreate: true })',
    },
    updated_at: {
      tsType: 'DateTime',
      imports: [{ source: 'luxon', namedImports: ['DateTime'] }],
      decorator: '@column.dateTime({ autoCreate: true, autoUpdate: true })',
    },
  },
  tables: {},
  primaryKey: (
    _tableName: string,
    primaryKeys: string[],
    columns: Record<string, DatabaseColumn>
  ) => {
    const columnName = primaryKeys[0]
    if (!columnName || !columns[columnName]) {
      return undefined
    }

    const column = columns[columnName]
    const internalType = DATA_TYPES_MAPPING[column.type] ?? column.type
    const inferredDataType =
      typeof DEFAULT_SCHEMA_RULES.types[internalType] === 'function'
        ? DEFAULT_SCHEMA_RULES.types[internalType](internalType, column)
        : DEFAULT_SCHEMA_RULES.types[internalType]

    return {
      columnName,
      columnInfo: {
        tsType: inferredDataType?.tsType ?? column.type,
        imports: inferredDataType?.imports ?? [],
        decorator: '@column({ isPrimary: true })',
      },
    }
  },
}
