# Schema Generation in Lucid

## Overview

Lucid's schema generator creates TypeScript model schemas by introspecting your database tables. It analyzes table structures and generates type-safe model definitions with proper TypeScript types, decorators, and imports.

## Basic Usage

```typescript
import { OrmSchemaGenerator } from '@adonisjs/lucid/orm'

const generator = new OrmSchemaGenerator(
  { outputPath: 'app/models/schemas.ts' },
  db,
  app
)

await generator.generate()
```

This generates model schemas for all tables in your database and writes them to the specified output file.

## Generated Output

For a `users` table with columns `id`, `email`, `created_at`:

```typescript
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export class UserSchema extends BaseModel {
  static $attributes = ['id', 'email', 'createdAt'] as const

  @column()
  declare id: number

  @column()
  declare email: string

  @column.dateTime()
  declare createdAt: DateTime
}
```

## Type Mapping

Database types are automatically mapped to TypeScript types:

- `integer`, `bigint` → `number`
- `varchar`, `text` → `string`
- `boolean` → `boolean`
- `timestamp`, `datetime` → `DateTime` (from luxon)
- `date` → `DateTime`
- `json`, `jsonb` → `any`
- Nullable columns get `| null` union type

## Custom Rules

Create custom type mappings and decorators using rules files:

```typescript
// config/schema_rules.ts
export default {
  // Global column name rules
  columns: {
    status: {
      tsType: 'UserStatus',
      decorator: '@column()',
      imports: [{ source: '#types/enums', namedImports: ['UserStatus'] }]
    }
  },

  // Global type rules
  types: {
    uuid: {
      tsType: 'string',
      decorator: '@column()',
      imports: []
    }
  },

  // Table-specific rules
  tables: {
    users: {
      columns: {
        email: {
          tsType: 'string',
          decorator: '@column({ isPrimary: true })',
          imports: []
        }
      }
    }
  }
}
```

Use custom rules:

```typescript
const generator = new OrmSchemaGenerator(
  {
    outputPath: 'app/models/schemas.ts',
    rulesPaths: ['config/schema_rules.ts']
  },
  db,
  app
)
```

## Multiple Rules Files

Load and merge multiple rules files for better organization:

```typescript
const generator = new OrmSchemaGenerator(
  {
    outputPath: 'app/models/schemas.ts',
    rulesPaths: [
      'config/rules/base.ts',
      'config/rules/enums.ts',
      'config/rules/custom_types.ts'
    ]
  },
  db,
  app
)
```

Rules are merged in order using deep merge strategy - later files override earlier ones.

## Rule Lookup Hierarchy

Rules are applied in this order (most specific to least specific):

1. Table-specific column rule: `tables.users.columns.email`
2. Table-specific type rule: `tables.users.types.varchar`
3. Global column rule: `columns.email`
4. Global type rule: `types.varchar`
5. Default built-in mapping

## Configuration Options

```typescript
type OrmSchemaGeneratorConfig = {
  // Database connection name (defaults to primary connection)
  connectionName?: string

  // Output file path (required)
  outputPath: string

  // Optional rules files to customize type mappings
  rulesPaths?: string[]
}
```

## Connection Handling

By default, the generator uses your primary database connection. For PostgreSQL, it respects the `searchPath` configuration:

```typescript
// Uses searchPath from connection config, defaults to ['public']
const generator = new OrmSchemaGenerator(
  {
    outputPath: 'schemas.ts',
    connectionName: 'postgres' // optional, defaults to primary
  },
  db,
  app
)
```

## System Tables

The generator automatically excludes system tables:
- PostgreSQL: `pg_*`, `information_schema.*`
- MySQL: `mysql.*`, `information_schema.*`, `performance_schema.*`
- SQLite: `sqlite_*`
- MSSQL: `sys.*`, `INFORMATION_SCHEMA.*`

## Import Management

The generator automatically manages imports, consolidating them at the top of the file:

```typescript
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { UserStatus } from '#types/enums'
import type { Priority } from '#types/priority'
```

Type-only imports use `import type` syntax for optimal tree-shaking.
