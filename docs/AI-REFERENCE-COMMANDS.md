# AdonisJS Lucid - CLI Commands Reference

## Overview

Lucid provides CLI commands through AdonisJS Ace for managing database operations.

**Location**: `commands/`

---

## Migration Commands

### migration:run

Run pending migrations.

```bash
node ace migration:run

# Options
--connection=<name>     # Use specific connection
--dry-run              # Show SQL without executing
--force                # Run in production without prompt
--compact-output       # Minimal output
--disable-locks        # Disable migration locks
```

**Examples:**
```bash
# Run on default connection
node ace migration:run

# Run on specific connection
node ace migration:run --connection=mysql

# Preview SQL
node ace migration:run --dry-run

# Force in production
node ace migration:run --force
```

**Location**: `commands/migration/run.ts`

---

### migration:rollback

Rollback migrations.

```bash
node ace migration:rollback

# Options
--connection=<name>     # Use specific connection
--dry-run              # Show SQL without executing
--force                # Rollback in production without prompt
--batch=<number>       # Rollback to specific batch (0 = all)
--step=<number>        # Rollback specific number of batches
--compact-output       # Minimal output
--disable-locks        # Disable migration locks
```

**Examples:**
```bash
# Rollback last batch
node ace migration:rollback

# Rollback to specific batch
node ace migration:rollback --batch=1

# Rollback all migrations
node ace migration:rollback --batch=0

# Rollback last 2 batches
node ace migration:rollback --step=2

# Preview rollback
node ace migration:rollback --dry-run
```

**Location**: `commands/migration/rollback.ts`

---

### migration:status

Show migration status.

```bash
node ace migration:status

# Options
--connection=<name>     # Use specific connection
```

**Output:**
```
┌──────────────────────────────┬────────┬─────────────────┐
│ Migration name               │ Status │ Batch           │
├──────────────────────────────┼────────┼─────────────────┤
│ 1_create_users_table         │ ✓      │ 1               │
│ 2_create_posts_table         │ ✓      │ 1               │
│ 3_add_phone_to_users         │ ✓      │ 2               │
│ 4_create_comments_table      │ ✗      │ Pending         │
└──────────────────────────────┴────────┴─────────────────┘
```

**Location**: `commands/migration/status.ts`

---

### migration:refresh

Rollback all migrations and re-run them.

```bash
node ace migration:refresh

# Options
--connection=<name>     # Use specific connection
--force                # Force in production
--seed                 # Run seeders after migrations
```

**Examples:**
```bash
# Refresh migrations
node ace migration:refresh

# Refresh and seed
node ace migration:refresh --seed
```

**Location**: `commands/migration/refresh.ts`

---

### migration:reset

Rollback all migrations.

```bash
node ace migration:reset

# Options
--connection=<name>     # Use specific connection
--force                # Force in production
--dry-run              # Preview only
```

**Location**: `commands/migration/reset.ts`

---

### migration:fresh

Drop all tables and re-run migrations.

```bash
node ace migration:fresh

# Options
--connection=<name>     # Use specific connection
--force                # Force in production
--seed                 # Run seeders after migrations
```

**Warning**: This drops ALL tables, including those not managed by migrations!

**Location**: `commands/migration/fresh.ts` (if available)

---

## Make Commands

### make:migration

Create a new migration file.

```bash
node ace make:migration <name>

# Options
--connection=<name>     # Specify connection
--table=<name>         # Table name (for alter migrations)
--create=<name>        # Table name (for create migrations)
--folder=<path>        # Custom folder path
```

**Examples:**
```bash
# Create table migration
node ace make:migration create_users_table

# Alter table migration
node ace make:migration add_phone_to_users --table=users

# Explicit create
node ace make:migration users --create=users

# Custom connection
node ace make:migration create_posts --connection=mysql

# Custom folder
node ace make:migration create_logs --folder=database/migrations/logs
```

**Generated File:**
```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

**Location**: `commands/make_migration.ts`

---

### make:model

Create a new model.

```bash
node ace make:model <name>

# Options
--migration, -m        # Create migration too
--factory, -f          # Create factory too
--controller, -c       # Create controller too
```

**Examples:**
```bash
# Just model
node ace make:model User

# Model with migration
node ace make:model Post --migration

# Model with migration and factory
node ace make:model Product -m -f

# Model with everything
node ace make:model Comment --migration --factory --controller
```

**Generated Model:**
```typescript
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

**Location**: `commands/make_model.ts`

---

### make:seeder

Create a new seeder.

```bash
node ace make:seeder <name>

# No special options
```

**Examples:**
```bash
node ace make:seeder User
node ace make:seeder DatabaseSeeder
```

**Generated Seeder:**
```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Write your database queries here
  }
}
```

**Location**: `commands/make_seeder.ts`

---

### make:factory

Create a new factory.

```bash
node ace make:factory <name>

# Options
--model=<name>         # Associated model name
```

**Examples:**
```bash
node ace make:factory User
node ace make:factory Post --model=Post
```

**Generated Factory:**
```typescript
import Factory from '@adonisjs/lucid/factories'
import User from '#models/user'

export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    //
  }
}).build()
```

**Location**: `commands/make_factory.ts`

---

## Database Commands

### db:seed

Run database seeders.

```bash
node ace db:seed

# Options
--connection=<name>     # Use specific connection
--files=<file1,file2>  # Run specific seeder files
--interactive, -i      # Interactive mode (select seeders)
--compact-output       # Minimal output
```

**Examples:**
```bash
# Run all seeders
node ace db:seed

# Run specific seeders
node ace db:seed --files=user_seeder.ts,post_seeder.ts

# Interactive mode
node ace db:seed --interactive

# Specific connection
node ace db:seed --connection=mysql
```

**Location**: `commands/db_seed.ts`

---

### db:wipe

Drop all tables, views, and types.

```bash
node ace db:wipe

# Options
--connection=<name>     # Use specific connection
--force                # Force in production
--drop-views           # Also drop views (default: true)
--drop-types           # Also drop types (default: true)
```

**Examples:**
```bash
# Wipe database
node ace db:wipe

# Wipe without dropping views
node ace db:wipe --no-drop-views

# Force in production
node ace db:wipe --force
```

**Warning**: This is destructive and cannot be undone!

**Location**: `commands/db_wipe.ts`

---

### db:truncate

Truncate all tables.

```bash
node ace db:truncate

# Options
--connection=<name>     # Use specific connection
--force                 # Force in production
--table=<table name>    # Define a specific table to truncate
--cascade               # Cascade truncation to related tables. Only works when specifying --table
```

**Examples:**
```bash
# Truncate all tables
node ace db:truncate

# Specific connection
node ace db:truncate --connection=mysql
```

**Note**: Keeps table structure, removes all data.

**Location**: `commands/db_truncate.ts`

---

## Command Workflows

### Initial Setup

```bash
# 1. Configure database in config/database.ts

# 2. Create initial migration
node ace make:migration create_users_table

# 3. Edit migration file

# 4. Run migration
node ace migration:run

# 5. Create model
node ace make:model User

# 6. Create factory
node ace make:factory User --model=User

# 7. Create seeder
node ace make:seeder User

# 8. Run seeder
node ace db:seed
```

### Development Workflow

```bash
# Create feature
node ace make:model Post -m -f

# Edit migration
# Edit model
# Edit factory

# Run migration
node ace migration:run

# Create seed data
node ace db:seed

# Test and iterate
# If changes needed:
node ace migration:rollback
# Edit migration
node ace migration:run
```

### Testing Workflow

```bash
# Reset database
node ace migration:refresh

# Seed test data
node ace db:seed

# Run tests
node ace test
```

### Production Deployment

```bash
# 1. Check migration status
node ace migration:status

# 2. Run pending migrations
node ace migration:run --force

# 3. Optionally seed production data
node ace db:seed --force --files=production_seeder.ts
```

---

## Custom Commands

You can create custom database commands:

```typescript
import { BaseCommand } from '@adonisjs/core/ace'
import { inject } from '@adonisjs/core'
import Database from '@adonisjs/lucid/services/db'

export default class DbBackup extends BaseCommand {
  static commandName = 'db:backup'
  static description = 'Create database backup'

  @inject()
  async run(db: typeof Database) {
    // Your backup logic
    this.logger.info('Creating backup...')

    const tables = await db.connection().raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `)

    this.logger.success('Backup created!')
  }
}
```

---

## Environment-Specific Behavior

### Production Safety

Most destructive commands require `--force` in production:

```bash
# These require --force in production
node ace migration:rollback --force
node ace migration:refresh --force
node ace db:wipe --force
node ace db:truncate --force
```

### Environment Detection

```typescript
// In commands
if (this.app.inProduction && !this.force) {
  this.logger.warning('Use --force to run in production')
  return
}
```

---

## Command Options Reference

### Common Options

```bash
--connection=<name>     # Database connection name
--force                # Skip production confirmation
--dry-run              # Preview without executing
--compact-output       # Minimal output
--help, -h             # Show help
```

### Migration Options

```bash
--batch=<number>       # Target batch number
--step=<number>        # Number of steps
--disable-locks        # Disable migration locks
```

### Seeder Options

```bash
--files=<files>        # Comma-separated file list
--interactive, -i      # Interactive selection
```

### Make Command Options

```bash
--migration, -m        # Create migration
--factory, -f          # Create factory
--controller, -c       # Create controller
--model=<name>         # Associated model
--table=<name>         # Table name
--create=<name>        # Create table
--folder=<path>        # Custom folder
```

---

## Troubleshooting

### Migration Locked

```bash
# If migration is stuck in "locked" state
# Check database for lock table
# Manually release lock or wait for timeout

# Or disable locks
node ace migration:run --disable-locks
```

### Migration Batch Issues

```bash
# Check current state
node ace migration:status

# Rollback to specific batch
node ace migration:rollback --batch=1

# Reset all and start fresh
node ace migration:reset
node ace migration:run
```

### Seeder Errors

```bash
# Run specific seeder for debugging
node ace db:seed --files=problematic_seeder.ts

# Use interactive mode
node ace db:seed --interactive
```

---

## Best Practices

### 1. Always Check Status Before Running

```bash
node ace migration:status
node ace migration:run
```

### 2. Use Dry Run for Preview

```bash
node ace migration:run --dry-run
node ace migration:rollback --dry-run
```

### 3. Name Migrations Descriptively

```bash
# Good
node ace make:migration create_users_table
node ace make:migration add_email_index_to_users
node ace make:migration create_posts_table

# Bad
node ace make:migration update
node ace make:migration changes
```

### 4. Test Migrations Both Ways

```bash
node ace migration:run
node ace migration:rollback
node ace migration:run
```

### 5. Use Version Control

Commit migration files to git:
```bash
git add database/migrations/
git commit -m "Add users table migration"
```

### 6. Seed After Migration in Development

```bash
node ace migration:refresh --seed
```

### 7. Use Interactive Mode for Safety

```bash
node ace db:seed --interactive
```

### 8. Create Atomic Migrations

Each migration should do one thing:
```bash
# Good - separate migrations
node ace make:migration create_users_table
node ace make:migration create_posts_table

# Bad - don't combine unrelated changes
node ace make:migration create_all_tables
```
