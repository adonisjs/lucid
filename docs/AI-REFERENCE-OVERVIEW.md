# AdonisJS Lucid - Overview & Architecture

## Project Information

**Package**: `@adonisjs/lucid`
**Version**: 22.0.0-next.1
**Description**: SQL ORM built on top of Active Record pattern
**License**: MIT
**Repository**: https://github.com/adonisjs/lucid
**Documentation**: https://lucid.adonisjs.com/docs/introduction

## What is Lucid?

Lucid is a SQL ORM for AdonisJS built on top of Knex.js. It provides:

- **Database Query Builder**: Fluent API for building SQL queries
- **Active Record ORM**: Full-featured object-relational mapping
- **Schema Builder**: Database schema management
- **Migrations**: Version control for database schemas
- **Seeders**: Populate database with test/initial data
- **Model Factories**: Generate fake data for testing
- **Multiple Database Support**: MySQL, PostgreSQL, SQLite, MSSQL, Oracle, LibSQL

## Architecture Overview

### Core Dependencies

- **Knex.js**: SQL query builder (foundation)
- **knex-dynamic-connection**: Dynamic connection management
- **@poppinss/macroable**: Add macros/extensions to classes
- **@poppinss/hooks**: Lifecycle hooks system
- **@faker-js/faker**: Fake data generation for factories
- **luxon**: DateTime handling

### Directory Structure

```
packages/lucid/
├── src/
│   ├── bindings/           # IoC container bindings
│   ├── clients/            # Database clients
│   ├── connection/         # Connection management
│   │   ├── index.ts        # Connection class
│   │   ├── manager.ts      # ConnectionManager
│   │   └── logger.ts       # Query logging
│   ├── database/           # Database query builder
│   │   ├── main.ts         # Database class (entry point)
│   │   ├── query_builder/  # Query builder implementations
│   │   ├── static_builder/ # Raw and Reference builders
│   │   ├── paginator/      # Pagination utilities
│   │   └── checks/         # Health checks
│   ├── orm/                # ORM (Active Record)
│   │   ├── base_model/     # BaseModel implementation
│   │   ├── decorators/     # Model decorators (@column, etc.)
│   │   ├── relations/      # Relationship types
│   │   │   ├── has_one/
│   │   │   ├── has_many/
│   │   │   ├── belongs_to/
│   │   │   ├── many_to_many/
│   │   │   └── has_many_through/
│   │   ├── query_builder/  # Model query builder
│   │   ├── paginator/      # Model paginator
│   │   ├── preloader/      # Eager loading
│   │   ├── adapter/        # Database adapter for models
│   │   └── naming_strategies/ # Snake/Camel case conversion
│   ├── schema/             # Schema builder (migrations base)
│   ├── migration/          # Migration runner
│   ├── seeders/            # Seeder system
│   │   ├── base_seeder.ts  # BaseSeeder class
│   │   ├── runner.ts       # SeederRunner
│   │   └── source.ts       # Seeder file discovery
│   ├── factories/          # Model factories
│   │   ├── main.ts         # FactoryManager
│   │   ├── factory_model.ts
│   │   └── relations/      # Factory relationship builders
│   ├── dialects/           # Database dialect implementations
│   │   ├── mysql.ts
│   │   ├── pg.ts
│   │   ├── sqlite.ts
│   │   ├── better_sqlite.ts
│   │   ├── libsql.ts
│   │   ├── mssql.ts
│   │   └── oracle.ts
│   ├── query_client/       # Query client implementation
│   ├── transaction_client/ # Transaction client
│   ├── query_reporter/     # Query event reporting
│   ├── query_runner/       # Query execution
│   ├── test_utils/         # Testing utilities
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── errors.ts           # Custom error classes
│   └── define_config.ts    # Config definition helper
├── commands/               # CLI commands
│   ├── db_seed.ts
│   ├── db_truncate.ts
│   ├── db_wipe.ts
│   ├── make_factory.ts
│   ├── make_migration.ts
│   ├── make_model.ts
│   ├── make_seeder.ts
│   └── migration/          # Migration commands
│       ├── run.ts
│       ├── rollback.ts
│       ├── status.ts
│       ├── refresh.ts
│       └── reset.ts
├── providers/              # Service providers
│   └── database_provider.ts
├── services/               # Exported services
├── stubs/                  # Code generation templates
├── tests/                  # Test suite
└── index.ts               # Main entry point
```

## Module Exports

### Main Entry (`index.ts`)
```typescript
export * as errors from './src/errors.js'
export { configure } from './configure.js'
export { stubsRoot } from './stubs/main.js'
export { defineConfig } from './src/define_config.js'
```

### Available Subpath Exports

```json
{
  ".": "./build/index.js",
  "./schema": "./build/src/schema/main.js",
  "./commands": "./build/commands/main.js",
  "./factories": "./build/src/factories/main.js",
  "./database": "./build/src/database/main.js",
  "./orm": "./build/src/orm/main.js",
  "./orm/relations": "./build/src/orm/relations/main.js",
  "./seeders": "./build/src/seeders/main.js",
  "./migration": "./build/src/migration/main.js",
  "./database_provider": "./build/providers/database_provider.js",
  "./utils": "./build/src/utils/index.js"
}
```

## Key Architectural Patterns

### 1. Active Record Pattern
Models inherit from `BaseModel` and encapsulate both data and behavior:
```typescript
class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string
}
```

### 2. Query Builder Pattern
Fluent chainable API for building queries:
```typescript
Database
  .from('users')
  .where('status', 'active')
  .orderBy('created_at', 'desc')
```

### 3. Repository Pattern (via Adapter)
Models use an adapter to interact with the database, allowing for easy swapping of data sources.

### 4. Service Locator Pattern
ConnectionManager manages multiple database connections:
```typescript
Database.connection('mysql')
Database.connection('postgres')
```

### 5. Decorator Pattern
TypeScript decorators define model structure:
```typescript
@column()
@hasMany()
@belongsTo()
```

### 6. Hook System
Lifecycle hooks using `@poppinss/hooks`:
```typescript
@beforeSave()
@afterCreate()
@beforeFind()
```

### 7. Macroable Classes
Extend classes at runtime:
```typescript
Database.macro('findByEmail', function (email) { ... })
```

## Connection Flow

1. **Configuration** → `defineConfig()` creates database config
2. **Database Class** → Instantiated with config, logger, emitter
3. **ConnectionManager** → Registers all configured connections
4. **QueryClient** → Created when connection is requested
5. **Knex Instance** → Underlying query builder from Knex.js
6. **Dialect** → Database-specific implementation (MySQL, Postgres, etc.)

## Query Execution Flow

1. **Model/Database** → Start query
2. **QueryBuilder** → Build query using chainable methods
3. **QueryRunner** → Execute query through Knex
4. **QueryReporter** → Emit events for logging/debugging
5. **Dialect** → Transform results based on database type
6. **Result** → Return rows/models

## Model Lifecycle

1. **Definition** → Class with decorators
2. **Boot** → Initialize model metadata
3. **Query** → ModelQueryBuilder
4. **Fetch** → Retrieve from database
5. **Hydrate** → Convert rows to model instances
6. **Hooks** → Trigger lifecycle hooks
7. **Relations** → Eager load relationships
8. **Return** → Model instances

## Testing Strategy

- **Japa**: Test runner
- **better-sqlite3**: Fast in-memory testing
- **Docker Compose**: Multi-database testing (MySQL, Postgres, MSSQL)
- **Test Utils**: Database helpers for testing
- **Factories**: Generate test data
- **Global Transactions**: Rollback after tests

## Performance Considerations

1. **Connection Pooling**: Via Knex/Tarn
2. **Query Caching**: Model metadata caching
3. **Lazy Loading**: Relations loaded on demand
4. **Eager Loading**: Preload to avoid N+1
5. **Query Aggregates**: Count/sum without loading models
6. **Pagination**: Efficient cursor/offset pagination
7. **Select Specific Columns**: Reduce data transfer

## Configuration Structure

```typescript
{
  connection: 'primary',          // Default connection
  connections: {
    primary: {
      client: 'mysql2',           // Database driver
      connection: {               // Connection details
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'myapp'
      },
      migrations: {
        naturalSort: true,
        paths: ['./database/migrations']
      },
      seeders: {
        paths: ['./database/seeders']
      },
      pool: {                     // Connection pool settings
        min: 2,
        max: 10
      },
      debug: false,               // Log queries
      healthCheck: true
    }
  }
}
```

## Common Use Cases

1. **CRUD Operations**: Create, Read, Update, Delete via models
2. **Complex Queries**: Query builder for advanced SQL
3. **Relationships**: Navigate model associations
4. **Pagination**: List data with pagination
5. **Transactions**: Ensure data consistency
6. **Migrations**: Evolve database schema
7. **Seeding**: Populate initial/test data
8. **Testing**: Factory-generated test data
9. **Multi-tenancy**: Multiple database connections
10. **Read Replicas**: Separate read/write connections

## Error Handling

Custom error classes in `src/errors.ts`:
- `E_INVALID_MODEL_STATE`
- `E_MISSING_MODEL_ATTRIBUTE`
- `E_UNMANAGED_DB_TRANSACTION`
- `E_INVALID_LUCID_MODEL`
- etc.

## Integration Points

- **AdonisJS Core**: Logger, Emitter, IoC Container
- **VineJS**: Validation rules (`unique`, `exists`)
- **Assembler**: Build system integration
- **AdonisJS Presets**: Project scaffolding

## Next Steps

Refer to the other AI reference documents:
- `AI-REFERENCE-DATABASE.md` - Database & Query Builder
- `AI-REFERENCE-ORM.md` - Models & Relationships
- `AI-REFERENCE-MIGRATIONS.md` - Schema & Migrations
- `AI-REFERENCE-FACTORIES.md` - Factories & Seeders
- `AI-REFERENCE-COMMANDS.md` - CLI Commands
- `AI-REFERENCE-API.md` - API Quick Reference
