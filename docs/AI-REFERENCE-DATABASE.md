# AdonisJS Lucid - Database & Query Builder Reference

## Database Class

**Location**: `src/database/main.ts`

The `Database` class is the main entry point for database operations. It manages connections and provides query builder instances.

### Key Properties

```typescript
class Database extends Macroable {
  manager: ConnectionManagerContract           // Connection manager
  primaryConnectionName: string                // Default connection name
  connectionGlobalTransactions: Map<...>       // Global transactions
  config: DatabaseConfig                       // Database configuration
}
```

### Core Methods

#### Connection Management

```typescript
// Get a connection (connects if not already connected)
connection(name?: string, options?: DatabaseClientOptions): QueryClientContract

// Get raw connection from manager
getRawConnection(name: string): Connection

// Options: { mode: 'read' | 'write' }
```

#### Query Builders

```typescript
// Standard query builder
query<Result = any>(options?: DatabaseClientOptions): DatabaseQueryBuilder

// Insert query builder (returns inserted IDs)
insertQuery<ReturnColumns = any>(): InsertQueryBuilder

// Model query builder
modelQuery<T extends LucidModel>(model: T): ModelQueryBuilder

// Raw query execution
rawQuery<Result = any>(sql: string, bindings?: any, options?: DatabaseClientOptions)

// Raw builder (non-executable)
raw(sql: string, bindings?: any): RawBuilder

// Reference builder (for column references)
ref(reference: string): ReferenceBuilder
```

#### Shortcuts

```typescript
// Select from table
from(table: string): DatabaseQueryBuilder

// Insert into table
table<ReturnColumns = any>(table: string): InsertQueryBuilder

// Access underlying Knex
knexQuery(): Knex.QueryBuilder
knexRawQuery(sql: string, bindings?: any[]): Knex.Raw
```

#### Transactions

```typescript
// Managed transaction (auto commit/rollback)
transaction<T>(
  callback: (trx: TransactionClientContract) => Promise<T>,
  options?: { isolationLevel?: IsolationLevels }
): Promise<T>

// Manual transaction
transaction(options?: { isolationLevel?: IsolationLevels }): Promise<TransactionClientContract>

// Global transactions (for testing)
beginGlobalTransaction(connection?: string): Promise<TransactionClientContract>
commitGlobalTransaction(connection?: string): Promise<void>
rollbackGlobalTransaction(connection?: string): Promise<void>
```

### Model Adapter

```typescript
// Get adapter for Lucid models
modelAdapter(): Adapter
```

---

## DatabaseQueryBuilder

**Location**: `src/database/query_builder/database.ts`

Fluent API for building SQL queries. Extends Knex query builder with additional features.

### Selection

```typescript
// Select columns
select(...columns: string[]): this
select('id', 'email', 'created_at')

// Select distinct
distinct(...columns: string[]): this

// Select with aliases
select({ userId: 'id', userEmail: 'email' })

// Select raw
selectRaw(sql: string, bindings?: any): this
```

### Where Clauses

```typescript
// Basic where
where(column: string, value: any): this
where(column: string, operator: string, value: any): this
where({ email: 'user@example.com', status: 'active' }): this

// Or where
orWhere(column: string, value: any): this

// Where in
whereIn(column: string, values: any[]): this
whereNotIn(column: string, values: any[]): this

// Where null
whereNull(column: string): this
whereNotNull(column: string): this

// Where between
whereBetween(column: string, range: [any, any]): this

// Where exists
whereExists(callback: Function): this

// Where JSON (Postgres/MySQL)
whereJsonSuperset(column: string, value: any): this
whereJsonSubset(column: string, value: any): this

// Where like
whereLike(column: string, value: string): this
whereILike(column: string, value: string): this  // Case-insensitive

// Raw where
whereRaw(sql: string, bindings?: any): this
```

### Joins

```typescript
// Inner join
join(table: string, first: string, operator: string, second: string): this
join(table: string, callback: Function): this

// Left join
leftJoin(table: string, first: string, second: string): this

// Right join
rightJoin(table: string, first: string, second: string): this

// Cross join
crossJoin(table: string): this

// Join raw
joinRaw(sql: string, bindings?: any): this
```

### Ordering & Limiting

```typescript
// Order by
orderBy(column: string, direction?: 'asc' | 'desc'): this
orderByRaw(sql: string, bindings?: any): this

// Group by
groupBy(...columns: string[]): this
groupByRaw(sql: string, bindings?: any): this

// Having
having(column: string, operator: string, value: any): this
havingRaw(sql: string, bindings?: any): this

// Limit & Offset
limit(value: number): this
offset(value: number): this

// Pagination helpers
forPage(page: number, perPage: number): this
```

### Aggregates

```typescript
// Count
count(column: string = '*', as?: string): Promise<number>
countDistinct(column: string): Promise<number>

// Sum
sum(column: string, as?: string): Promise<number>

// Average
avg(column: string, as?: string): Promise<number>

// Min/Max
min(column: string, as?: string): Promise<number>
max(column: string, as?: string): Promise<number>

// Generic aggregate
aggregate(aggregate: { method: string, column: string, as?: string }): this
```

### Data Modification

```typescript
// Update
update(data: object): Promise<number>
update({ status: 'active', updated_at: DateTime.now() })

// Increment/Decrement
increment(column: string, value?: number): Promise<void>
decrement(column: string, value?: number): Promise<void>

// Delete
delete(): Promise<number>  // Returns count of deleted rows

// Truncate (careful!)
truncate(): Promise<void>
```

### Execution

```typescript
// Get all rows
exec(): Promise<any[]>

// Get first row
first(): Promise<any | null>

// Get first or fail
firstOrFail(): Promise<any>

// Pluck single column
pluck(column: string): Promise<any[]>

// Get as object with key-value pairs
pojo(): Promise<object>
```

### Pagination

```typescript
// Simple paginator (no total count)
paginate(page: number, perPage: number = 20): Promise<SimplePaginatorContract>

// Example result:
{
  data: [...],
  meta: {
    currentPage: 1,
    perPage: 20,
    firstPage: 1,
    hasMorePages: true,
    hasPages: true
  }
}
```

### Advanced Features

```typescript
// Unions
union(queries: any[], wrap?: boolean): this
unionAll(queries: any[]): this

// With (Common Table Expressions)
with(alias: string, query: Function): this
withRecursive(alias: string, query: Function): this

// Lock rows
forUpdate(): this     // FOR UPDATE
forShare(): this      // FOR SHARE (Postgres)

// Skip locked rows (Postgres, MySQL 8+)
skipLocked(): this
noWait(): this

// Distinct on (Postgres)
distinctOn(...columns: string[]): this

// Use index hint (MySQL)
useIndex(indexes: string[]): this

// Force index (MySQL)
forceIndex(indexes: string[]): this

// Ignore index (MySQL)
ignoreIndex(indexes: string[]): this
```

### Query Debugging

```typescript
// Enable debugging for this query
debug(enable: boolean = true): this

// Get SQL without executing
toSQL(): { sql: string, bindings: any[] }

// Get query string
toQuery(): string

// Explain query
explain(): Promise<any>
```

### Transaction Support

```typescript
// Use within transaction
useTransaction(trx: TransactionClientContract): this

// Check if using transaction
isTransaction: boolean
```

---

## InsertQueryBuilder

**Location**: `src/database/query_builder/insert.ts`

Specialized builder for INSERT operations with support for returning values.

### Basic Insert

```typescript
// Insert single row
table('users').insert({ email: 'user@example.com', name: 'John' })

// Insert multiple rows
table('users').insert([
  { email: 'user1@example.com', name: 'John' },
  { email: 'user2@example.com', name: 'Jane' }
])

// Insert and return values (Postgres, MSSQL, Oracle)
table('users')
  .insert({ email: 'user@example.com' })
  .returning(['id', 'created_at'])

// Insert and return all columns
table('users')
  .insert({ email: 'user@example.com' })
  .returning('*')
```

### Multi-Insert

```typescript
// Insert multiple rows efficiently
table('users').multiInsert([
  { email: 'user1@example.com' },
  { email: 'user2@example.com' }
])
```

### Insert from Select

```typescript
// Insert results from another query
table('archived_users')
  .insert(
    Database.from('users').where('deleted_at', '<', DateTime.now().minus({ years: 1 }))
  )
```

---

## QueryClient

**Location**: `src/query_client/index.ts`

Wrapper around a database connection with mode support (read/write/dual).

### Properties

```typescript
class QueryClient {
  mode: 'dual' | 'read' | 'write'
  connectionName: string
  debug: boolean
  isTransaction: boolean
}
```

### Methods

```typescript
// Get Knex client
getReadClient(): Knex
getWriteClient(): Knex
knexQuery(): Knex.QueryBuilder
knexRawQuery(sql: string, bindings?: any): Knex.Raw

// Schema builder
schema: Knex.SchemaBuilder

// Query builders
query<Result>(): DatabaseQueryBuilder<Result>
insertQuery<ReturnColumns>(): InsertQueryBuilder<ReturnColumns>
rawQuery<Result>(sql: string, bindings?: any): RawQueryBuilder<Result>
from(table: string): DatabaseQueryBuilder
table<ReturnColumns>(table: string): InsertQueryBuilder<ReturnColumns>

// Transactions
transaction<T>(callback: Function, options?): Promise<T>
transaction(options?): Promise<TransactionClientContract>

// Model operations
modelQuery<Model>(model: Model): ModelQueryBuilder<Model>
```

---

## TransactionClient

**Location**: `src/transaction_client/index.ts`

Extends QueryClient for transaction-specific operations.

### Additional Methods

```typescript
// Commit transaction
commit(): Promise<void>

// Rollback transaction
rollback(): Promise<void>

// Check if committed/rolled back
isCompleted: boolean

// Events
on('commit', callback): void
on('rollback', callback): void

// Get transaction from Knex
knexClient: Knex.Transaction
```

### Isolation Levels

```typescript
type IsolationLevels =
  | 'read uncommitted'
  | 'read committed'
  | 'snapshot'
  | 'repeatable read'
  | 'serializable'
```

---

## ConnectionManager

**Location**: `src/connection/manager.ts`

Manages multiple database connections.

### Methods

```typescript
// Add connection
add(name: string, config: ConnectionConfig): void

// Connect to database
connect(name: string): void

// Get connection
get(name: string): Connection | undefined

// Check if connection exists
has(name: string): boolean

// Close connection
close(name: string): Promise<void>

// Close all connections
closeAll(): Promise<void>

// Patch connection config at runtime
patch(name: string, config: Partial<ConnectionConfig>): void

// Release connection (for health checks)
release(name: string): Promise<void>

// List all connections
connections: Map<string, Connection>

// Events
on('connect', callback): void
on('disconnect', callback): void
on('error', callback): void
```

---

## Connection

**Location**: `src/connection/index.ts`

Represents a single database connection.

### Properties

```typescript
class Connection {
  name: string
  config: ConnectionConfig
  state: 'registered' | 'open' | 'closing' | 'closed' | 'migrating'
  connection?: Knex  // Knex instance
  readClient: Knex
  writeClient: Knex
  dialect: DialectContract
}
```

### Methods

```typescript
// Connect
connect(): void

// Disconnect
disconnect(): Promise<void>

// Get pool stats
pool: { used: number, free: number, pending: number }

// Check health
getReport(): Promise<HealthCheckResult>
```

---

## Raw & Reference Builders

### RawBuilder

**Location**: `src/database/static_builder/raw.ts`

Create raw SQL expressions.

```typescript
// Raw SQL
Database.raw('CURRENT_TIMESTAMP')
Database.raw('COUNT(*) as total')
Database.raw('LOWER(?)', ['EMAIL@EXAMPLE.COM'])

// Use in queries
query()
  .select(Database.raw('COUNT(*) as total'))
  .where('created_at', '>', Database.raw('NOW() - INTERVAL 1 DAY'))
```

### ReferenceBuilder

**Location**: `src/database/static_builder/reference.ts`

Reference columns safely (prevents SQL injection).

```typescript
// Column reference
Database.ref('users.email')
Database.ref('tableName.columnName')

// Use in queries
query()
  .select('u.name', Database.ref('p.title'))
  .from('users as u')
  .join('posts as p', 'u.id', '=', Database.ref('p.user_id'))
```

---

## SimplePaginator

**Location**: `src/database/paginator/simple_paginator.ts`

Lightweight pagination without total count.

### Properties

```typescript
class SimplePaginator {
  all(): any[]                    // All rows
  perPage: number                 // Items per page
  currentPage: number             // Current page number
  firstPage: number               // Always 1
  hasPages: boolean               // More than one page?
  hasMorePages: boolean           // Is there a next page?
  isEmpty: boolean                // No results?
}
```

### Methods

```typescript
// Get URL for page
getUrl(page: number): string

// Get URLs
getUrls(): { first: string, last: string, next?: string, previous?: string }

// Get query string for page
getQueryString(page: number): string

// Convert to JSON
toJSON(): { meta: {...}, data: [...] }
```

---

## Health Checks

**Location**: `src/database/checks/`

### DbCheck

Check database connectivity.

```typescript
import { DbCheck } from '@adonisjs/lucid/database'

const check = new DbCheck(database)
const result = await check.run()

// Result:
{
  displayName: 'Database',
  health: {
    healthy: true,
    message: 'All connections are healthy'
  },
  meta: {
    connections: {
      primary: {
        connection: 'primary',
        used: 2,
        free: 8,
        pending: 0
      }
    }
  }
}
```

### DbConnectionCountCheck

Monitor connection pool usage.

```typescript
import { DbConnectionCountCheck } from '@adonisjs/lucid/database'

const check = new DbConnectionCountCheck(database, {
  connections: [{ name: 'primary', warningThreshold: 8, failureThreshold: 9 }]
})

const result = await check.run()
```

---

## Query Events

Lucid emits events during query execution for logging and debugging.

### Event: `db:query`

```typescript
emitter.on('db:query', (query) => {
  console.log(query.sql)
  console.log(query.bindings)
  console.log(query.duration)  // In milliseconds
  console.log(query.connection)
  console.log(query.inTransaction)
  console.log(query.method)  // 'select', 'insert', 'update', 'delete'
})
```

### Debugging Individual Queries

```typescript
// Enable debug for single query
await Database
  .from('users')
  .debug(true)
  .select('*')

// Enable debug for all queries on a connection
Database.connection('primary', { debug: true })
```

---

## Database Drivers

Lucid supports multiple database drivers through Knex.

### Supported Databases

```typescript
// MySQL / MariaDB
client: 'mysql2'
npm install mysql2

// PostgreSQL
client: 'pg'
npm install pg

// SQLite
client: 'sqlite3'
npm install sqlite3

// Better SQLite (faster, synchronous)
client: 'better-sqlite3'
npm install better-sqlite3

// LibSQL (Turso)
client: 'libsql'
npm install @libsql/sqlite3

// Microsoft SQL Server
client: 'mssql'
npm install tedious

// Oracle
client: 'oracledb'
npm install oracledb
```

### Dialect-Specific Features

Each dialect implementation is in `src/dialects/` and handles:
- Connection configuration
- Data type mapping
- SQL syntax variations
- Returning clause support
- JSON operations
- Full-text search
- Index hints
- Transaction isolation levels

---

## Best Practices

### 1. Always Use Transactions for Multi-Step Operations

```typescript
await Database.transaction(async (trx) => {
  await trx.table('accounts').where('id', 1).decrement('balance', 100)
  await trx.table('accounts').where('id', 2).increment('balance', 100)
})
```

### 2. Use Read/Write Mode for Replicas

```typescript
// Read from replica
const users = await Database.connection('primary', { mode: 'read' })
  .from('users')
  .select('*')

// Write to primary
await Database.connection('primary', { mode: 'write' })
  .table('users')
  .insert({ email: 'user@example.com' })
```

### 3. Close Connections Gracefully

```typescript
// On application shutdown
await Database.manager.closeAll()
```

### 4. Use Prepared Statements

```typescript
// Good: Bindings prevent SQL injection
await Database.rawQuery('SELECT * FROM users WHERE email = ?', ['user@example.com'])

// Bad: Direct interpolation
await Database.rawQuery(`SELECT * FROM users WHERE email = '${email}'`)
```

### 5. Monitor Connection Pool

```typescript
const connection = Database.getRawConnection('primary')
console.log(connection.pool)
// { used: 2, free: 8, pending: 0 }
```
