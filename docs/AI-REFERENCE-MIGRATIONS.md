# AdonisJS Lucid - Migrations & Schema Reference

## Migrations Overview

Migrations provide version control for database schemas. They allow you to define and evolve your database structure over time.

**Location**: `src/schema/main.ts`, `src/migration/`

---

## BaseSchema

Base class for all migrations.

### Basic Migration Structure

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('email').notNullable().unique()
      table.string('password').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Migration Properties

```typescript
class Migration extends BaseSchema {
  // Table name being modified
  protected tableName = 'users'

  // Disable transactions for this migration
  static disableTransactions = false

  // Database connection (uses default if not specified)
  connection?: string

  // Access schema builder
  this.schema: Knex.SchemaBuilder

  // Access database client
  this.db: QueryClientContract

  // Check if dry run
  this.dryRun: boolean

  // Enable/disable debugging
  this.debug: boolean

  // Migration file path
  this.file: string
}
```

---

## Schema Builder API

### Table Operations

#### Create Table

```typescript
async up() {
  this.schema.createTable('users', (table) => {
    table.increments('id')
    table.string('email')
    // ... columns
  })
}
```

#### Create Table If Not Exists

```typescript
async up() {
  this.schema.createTableIfNotExists('users', (table) => {
    table.increments('id')
  })
}
```

#### Alter Table

```typescript
async up() {
  this.schema.alterTable('users', (table) => {
    table.string('phone').nullable()
    table.dropColumn('old_column')
  })
}
```

#### Rename Table

```typescript
async up() {
  this.schema.renameTable('old_name', 'new_name')
}
```

#### Drop Table

```typescript
async down() {
  this.schema.dropTable('users')
}
```

#### Drop Table If Exists

```typescript
async down() {
  this.schema.dropTableIfExists('users')
}
```

#### Check Table Exists

```typescript
async up() {
  const exists = await this.schema.hasTable('users')
  if (!exists) {
    // Create table
  }
}
```

---

## Column Types

### Integer Types

```typescript
// Auto-incrementing integer primary key
table.increments('id')

// Big auto-incrementing integer
table.bigIncrements('id')

// Integer
table.integer('age')

// Big integer (for large numbers)
table.bigInteger('views')

// Small integer (-32768 to 32767)
table.smallint('priority')

// Tiny integer (0 to 255)
table.tinyint('status')

// Unsigned integers (MySQL)
table.integer('count').unsigned()
```

### String Types

```typescript
// String with default length (255)
table.string('name')

// String with specific length
table.string('email', 100)

// Text (for long strings)
table.text('description')

// Long text
table.text('content', 'longtext')

// Medium text
table.text('content', 'mediumtext')

// UUID
table.uuid('id')

// JSON
table.json('metadata')

// JSONB (PostgreSQL - better performance)
table.jsonb('settings')

// Enum
table.enum('status', ['pending', 'active', 'inactive'])
table.enu('role', ['admin', 'user', 'guest'])  // Alternative syntax
```

### Numeric Types

```typescript
// Decimal/Numeric
table.decimal('price', 8, 2)  // precision, scale

// Float
table.float('rating')
table.float('rating', 8, 2)  // precision, scale

// Double
table.double('latitude')
table.double('latitude', 15, 10)
```

### Date & Time Types

```typescript
// Date (YYYY-MM-DD)
table.date('birth_date')

// DateTime (YYYY-MM-DD HH:MM:SS)
table.dateTime('published_at')

// DateTime with precision (fractional seconds)
table.dateTime('published_at', { precision: 6 })

// Timestamp (Unix timestamp)
table.timestamp('created_at')

// Timestamp with default to current time
table.timestamp('created_at').defaultTo(this.now())

// Timestamps (created_at, updated_at)
table.timestamps(true, true)  // useTimestamps, defaultToNow

// Time
table.time('opening_time')

// Year
table.specificType('year', 'YEAR')  // MySQL
```

### Boolean

```typescript
table.boolean('is_active')
table.boolean('is_active').defaultTo(false)
```

### Binary

```typescript
// Binary data
table.binary('file_data')

// Specific length
table.binary('hash', 32)
```

### Special Types

```typescript
// Geometry (spatial data)
table.geometry('location')
table.geography('location')
table.point('coordinates')
table.linestring('route')
table.polygon('boundary')

// Specific type (database-specific)
table.specificType('custom_column', 'CUSTOM_TYPE')
```

---

## Column Modifiers

### Constraints

```typescript
// Not null
table.string('email').notNullable()

// Nullable (default)
table.string('phone').nullable()

// Default value
table.string('status').defaultTo('pending')
table.boolean('is_active').defaultTo(false)
table.timestamp('created_at').defaultTo(this.now())

// Unsigned (MySQL)
table.integer('count').unsigned()

// Unique
table.string('email').unique()

// Unique with constraint name
table.string('email').unique('unique_email')

// Primary key
table.integer('id').primary()

// Composite primary key (in table callback)
table.primary(['user_id', 'role_id'])

// Comment
table.string('email').comment('User email address')
```

### Indexes

```typescript
// Simple index
table.string('email').index()

// Named index
table.string('email').index('idx_email')

// Composite index
table.index(['first_name', 'last_name'], 'idx_full_name')

// Unique index
table.unique(['email'], 'unique_user_email')

// Spatial index
table.index(['location'], 'idx_location', 'SPATIAL')

// Full-text index (MySQL)
table.index(['title', 'content'], 'idx_search', 'FULLTEXT')

// Index types (PostgreSQL)
table.index(['email'], 'idx_email', 'btree')
table.index(['tags'], 'idx_tags', 'gin')
table.index(['location'], 'idx_location', 'gist')
```

### Altering Columns

```typescript
async up() {
  this.schema.alterTable('users', (table) => {
    // Modify column
    table.string('email', 255).alter()

    // Rename column
    table.renameColumn('name', 'full_name')

    // Drop column
    table.dropColumn('old_column')

    // Drop multiple columns
    table.dropColumns('col1', 'col2', 'col3')

    // Drop index
    table.dropIndex(['email'], 'idx_email')

    // Drop unique constraint
    table.dropUnique(['email'], 'unique_email')

    // Drop primary key
    table.dropPrimary('users_pkey')

    // Drop foreign key
    table.dropForeign(['user_id'], 'fk_user')
  })
}
```

---

## Foreign Keys

### Basic Foreign Key

```typescript
async up() {
  this.schema.createTable('posts', (table) => {
    table.increments('id')

    // Foreign key column
    table.integer('user_id').unsigned()

    // Foreign key constraint
    table.foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
  })
}
```

### Foreign Key Options

```typescript
table.foreign('user_id')
  .references('id')
  .inTable('users')
  .onDelete('CASCADE')      // CASCADE, SET NULL, NO ACTION, RESTRICT
  .onUpdate('CASCADE')
  .withKeyName('fk_user')   // Custom constraint name
  .deferrable('deferred')   // PostgreSQL: immediate, deferred
```

### Composite Foreign Key

```typescript
table.foreign(['user_id', 'role_id'])
  .references(['id', 'id'])
  .inTable('user_roles')
```

### Drop Foreign Key

```typescript
async down() {
  this.schema.alterTable('posts', (table) => {
    table.dropForeign(['user_id'])
    // or with custom name
    table.dropForeign(['user_id'], 'fk_user')
  })
}
```

---

## Raw Queries in Migrations

### Using raw()

```typescript
async up() {
  // Raw column definition
  this.schema.createTable('users', (table) => {
    table.increments('id')
    table.specificType('ip_address', 'INET')  // PostgreSQL
  })

  // Execute raw SQL
  await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
}
```

### Using defer()

Defer ensures queries run after schema operations:

```typescript
async up() {
  this.schema.createTable('users', (table) => {
    table.increments('id')
    table.string('email')
  })

  // Defer runs after table creation
  this.defer(async (db) => {
    await db.table('users').insert({
      email: 'admin@example.com'
    })
  })
}
```

### now() Helper

```typescript
async up() {
  this.schema.createTable('posts', (table) => {
    table.increments('id')
    table.timestamp('created_at').defaultTo(this.now())

    // With precision
    table.timestamp('created_at').defaultTo(this.now(6))
  })
}
```

---

## Migration Examples

### Users Table

```typescript
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('email', 255).notNullable().unique()
      table.string('username', 80).notNullable().unique()
      table.string('password', 180).notNullable()
      table.string('remember_me_token').nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('email_verified_at').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Posts Table with Relations

```typescript
export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign key
      table.integer('user_id').unsigned().notNullable()

      table.string('title', 255).notNullable()
      table.text('content', 'longtext').notNullable()
      table.string('slug', 255).notNullable().unique()
      table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft')
      table.integer('view_count').unsigned().defaultTo(0)
      table.jsonb('metadata').nullable()

      table.timestamp('published_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['user_id'])
      table.index(['status'])
      table.index(['published_at'])

      // Foreign key constraint
      table.foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Pivot Table (Many-to-Many)

```typescript
export default class extends BaseSchema {
  protected tableName = 'post_tag'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Composite primary key
      table.integer('post_id').unsigned().notNullable()
      table.integer('tag_id').unsigned().notNullable()

      // Optional pivot columns
      table.integer('order').unsigned().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Composite primary
      table.primary(['post_id', 'tag_id'])

      // Foreign keys
      table.foreign('post_id')
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')

      table.foreign('tag_id')
        .references('id')
        .inTable('tags')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Adding Column to Existing Table

```typescript
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('phone', 20).nullable()
      table.index(['phone'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('phone')
    })
  }
}
```

### Renaming Column

```typescript
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('name', 'full_name')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('full_name', 'name')
    })
  }
}
```

### Migration with Data Transformation

```typescript
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    // Add new column
    this.schema.alterTable(this.tableName, (table) => {
      table.string('status').defaultTo('active')
    })

    // Migrate data
    this.defer(async (db) => {
      const users = await db.from('users').select('*')

      for (const user of users) {
        await db.from('users')
          .where('id', user.id)
          .update({
            status: user.is_active ? 'active' : 'inactive'
          })
      }
    })

    // Drop old column
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_active')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_active').defaultTo(true)
    })

    this.defer(async (db) => {
      const users = await db.from('users').select('*')

      for (const user of users) {
        await db.from('users')
          .where('id', user.id)
          .update({
            is_active: user.status === 'active'
          })
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('status')
    })
  }
}
```

### Full-Text Search Setup (MySQL)

```typescript
export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['title', 'content'], 'posts_fulltext_idx', 'FULLTEXT')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['title', 'content'], 'posts_fulltext_idx')
    })
  }
}
```

### PostgreSQL Extensions

```typescript
export default class extends BaseSchema {
  async up() {
    // Enable UUID extension
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    // Enable PostGIS
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS postgis')

    // Enable pg_trgm (trigram similarity)
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS pg_trgm')
  }

  async down() {
    await this.db.rawQuery('DROP EXTENSION IF EXISTS "uuid-ossp"')
    await this.db.rawQuery('DROP EXTENSION IF EXISTS postgis')
    await this.db.rawQuery('DROP EXTENSION IF EXISTS pg_trgm')
  }
}
```

---

## Migration Runner

**Location**: `src/migration/runner.ts`

### MigrationRunner API

The MigrationRunner is used internally by CLI commands.

```typescript
import { MigrationRunner } from '@adonisjs/lucid/migration'

const runner = new MigrationRunner(database, app, {
  direction: 'up',              // 'up' or 'down'
  connectionName: 'primary',
  dryRun: false
})

// Get migration status
const status = await runner.getList()

// Run migrations
await runner.run()

// Rollback migrations
await runner.rollback()

// Close connections
await runner.close()
```

---

## Migration Commands

### Create Migration

```bash
node ace make:migration create_users_table
node ace make:migration create_users_table --connection=mysql
node ace make:migration add_phone_to_users --table=users
```

### Run Migrations

```bash
# Run pending migrations
node ace migration:run

# Run on specific connection
node ace migration:run --connection=mysql

# Dry run (show SQL without executing)
node ace migration:run --dry-run

# Force run in production
node ace migration:run --force
```

### Rollback Migrations

```bash
# Rollback last batch
node ace migration:rollback

# Rollback last batch (dry run)
node ace migration:rollback --dry-run

# Rollback to specific batch
node ace migration:rollback --batch=1

# Rollback all
node ace migration:rollback --batch=0

# Force rollback in production
node ace migration:rollback --force
```

### Migration Status

```bash
# Show migration status
node ace migration:status

# For specific connection
node ace migration:status --connection=mysql
```

### Reset & Refresh

```bash
# Rollback all and re-run all migrations
node ace migration:refresh

# Rollback all migrations
node ace migration:reset
```

---

## Best Practices

### 1. Always Write Down() Methods

```typescript
async up() {
  this.schema.createTable('users', (table) => { ... })
}

async down() {
  this.schema.dropTable('users')  // Always implement!
}
```

### 2. Use Transactions (Default)

```typescript
// Migrations run in transactions by default
// To disable:
static disableTransactions = true
```

### 3. Create Indexes for Foreign Keys

```typescript
table.integer('user_id').unsigned().notNullable()
table.index(['user_id'])  // Index for better query performance
table.foreign('user_id').references('id').inTable('users')
```

### 4. Order Migrations Properly

Ensure dependent tables are created after their dependencies:
```
1_create_users_table.ts
2_create_posts_table.ts  (depends on users)
3_create_comments_table.ts  (depends on posts)
```

### 5. Use Nullable for Optional Columns

```typescript
table.string('phone').nullable()  // Optional field
table.string('email').notNullable()  // Required field
```

### 6. Set Proper ON DELETE Actions

```typescript
table.foreign('user_id')
  .references('id')
  .inTable('users')
  .onDelete('CASCADE')  // Delete posts when user is deleted
  .onUpdate('CASCADE')  // Update if user id changes
```

### 7. Use defer() for Data Migration

```typescript
async up() {
  this.schema.createTable('users', ...)

  this.defer(async (db) => {
    // Seed initial data after table creation
    await db.table('users').insert({ ... })
  })
}
```

### 8. Document Complex Migrations

```typescript
/**
 * This migration restructures the user authentication system.
 * It moves from email-only auth to support multiple auth providers.
 */
export default class extends BaseSchema {
  // ...
}
```

### 9. Test Migrations Both Ways

Always test both `up()` and `down()`:
```bash
node ace migration:run
node ace migration:rollback
node ace migration:run
```

### 10. Be Careful with Column Alterations

Some databases don't support altering columns well. Consider:
- Creating new column
- Migrating data
- Dropping old column
