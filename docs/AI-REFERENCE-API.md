# AdonisJS Lucid - Quick API Reference

A concise reference for the most commonly used Lucid APIs.

---

## Imports

```typescript
// Database
import Database from '@adonisjs/lucid/services/db'

// ORM
import { BaseModel, column, hasMany, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'

// Schema
import { BaseSchema } from '@adonisjs/lucid/schema'

// Seeders
import { BaseSeeder } from '@adonisjs/lucid/seeders'

// Factories
import Factory from '@adonisjs/lucid/factories'

// Config
import { defineConfig } from '@adonisjs/lucid'

// DateTime
import { DateTime } from 'luxon'
```

---

## Database Query Builder

### Basic Queries

```typescript
// Select
await Database.from('users').select('*')
await Database.from('users').select('id', 'email')
await Database.from('users').where('status', 'active')

// Insert
await Database.table('users').insert({ email: 'user@example.com' })
await Database.table('users').insert([{ email: 'a' }, { email: 'b' }])
await Database.table('users').insert({ email: 'a' }).returning('id')

// Update
await Database.from('users').where('id', 1).update({ status: 'active' })

// Delete
await Database.from('users').where('id', 1).delete()

// Count
await Database.from('users').count('* as total')
```

### Where Clauses

```typescript
.where('column', 'value')
.where('column', '>', 10)
.where({ email: 'test@example.com', status: 'active' })
.whereNot('status', 'banned')
.whereIn('id', [1, 2, 3])
.whereNotIn('status', ['banned', 'deleted'])
.whereBetween('age', [18, 65])
.whereNull('deleted_at')
.whereNotNull('email_verified_at')
.whereLike('email', '%@gmail.com')
.whereILike('email', '%@gmail.com')
.whereRaw('age > ?', [18])
```

### Joins

```typescript
.join('posts', 'users.id', 'posts.user_id')
.leftJoin('profiles', 'users.id', 'profiles.user_id')
.rightJoin('orders', 'users.id', 'orders.user_id')
```

### Order & Limit

```typescript
.orderBy('created_at', 'desc')
.orderByRaw('created_at DESC')
.groupBy('status')
.having('count', '>', 10)
.limit(10)
.offset(20)
.paginate(page, perPage)
```

### Aggregates

```typescript
await Database.from('users').count('* as total')
await Database.from('orders').sum('amount as total')
await Database.from('products').avg('price as avg_price')
await Database.from('products').min('price')
await Database.from('products').max('price')
```

### Transactions

```typescript
// Managed
await Database.transaction(async (trx) => {
  await trx.table('users').insert({ email: 'a' })
  await trx.table('posts').insert({ title: 'b' })
})

// Manual
const trx = await Database.transaction()
try {
  await trx.table('users').insert({ email: 'a' })
  await trx.commit()
} catch (error) {
  await trx.rollback()
}
```

### Raw Queries

```typescript
await Database.rawQuery('SELECT * FROM users WHERE id = ?', [1])
Database.raw('NOW()')
Database.ref('users.email')
```

---

## Models

### Define Model

```typescript
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

### CRUD Operations

```typescript
// Create
const user = new User()
user.email = 'user@example.com'
await user.save()

const user = await User.create({ email: 'user@example.com' })
const users = await User.createMany([{ email: 'a' }, { email: 'b' }])

// Read
const user = await User.find(1)
const user = await User.findOrFail(1)
const user = await User.findBy('email', 'user@example.com')
const users = await User.all()
const users = await User.query().where('status', 'active')

// Update
const user = await User.find(1)
user.email = 'new@example.com'
await user.save()

user.merge({ email: 'new@example.com', status: 'active' })
await user.save()

await User.query().where('id', 1).update({ status: 'active' })

// Delete
const user = await User.find(1)
await user.delete()

await User.query().where('status', 'inactive').delete()
```

### Query Builder

```typescript
// Basic
User.query()
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10)

// With relationships
User.query()
  .preload('posts')
  .preload('profile')

// With constraints
User.query()
  .preload('posts', (query) => {
    query.where('published', true).limit(5)
  })

// Has queries
User.query()
  .has('posts')
  .has('posts', '>', 5)
  .whereHas('posts', (query) => {
    query.where('published', true)
  })

// Aggregates
User.query()
  .withCount('posts')
  .withAggregate('posts', (query) => {
    query.sum('views').as('totalViews')
  })

// Pagination
await User.query().paginate(1, 20)
```

---

## Relationships

### Has One

```typescript
// Model definition
class User extends BaseModel {
  @hasOne(() => Profile)
  declare profile: HasOne<typeof Profile>
}

class Profile extends BaseModel {
  @column()
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

// Usage
await user.load('profile')
await user.related('profile').create({ bio: 'Hello' })
```

### Has Many

```typescript
// Model definition
class User extends BaseModel {
  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>
}

class Post extends BaseModel {
  @column()
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

// Usage
await user.load('posts')
await user.related('posts').create({ title: 'Hello' })
await user.related('posts').createMany([...])
```

### Belongs To

```typescript
// Model definition
class Post extends BaseModel {
  @column()
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

// Usage
await post.load('user')
await post.related('user').associate(user)
await post.related('user').dissociate()
```

### Many to Many

```typescript
// Model definition
class User extends BaseModel {
  @manyToMany(() => Role, {
    pivotTable: 'role_user',
    pivotTimestamps: true
  })
  declare roles: ManyToMany<typeof Role>
}

class Role extends BaseModel {
  @manyToMany(() => User)
  declare users: ManyToMany<typeof User>
}

// Usage
await user.load('roles')
await user.related('roles').attach([1, 2, 3])
await user.related('roles').detach([1])
await user.related('roles').sync([1, 2, 3])
await user.related('roles').sync({
  1: { expires_at: DateTime.now() }
})
```

### Has Many Through

```typescript
class Country extends BaseModel {
  @hasManyThrough([() => Post, () => User])
  declare posts: HasManyThrough<typeof Post>
}

// Usage
await country.load('posts')
```

---

## Model Hooks

```typescript
import { beforeSave, afterCreate, beforeFind } from '@adonisjs/lucid/orm'

class User extends BaseModel {
  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }

  @afterCreate()
  static async sendWelcome(user: User) {
    // Send email
  }

  @beforeFind()
  static ignoreDeleted(query) {
    query.whereNull('deleted_at')
  }
}
```

**Available Hooks:**
- `@beforeSave()`, `@afterSave()`
- `@beforeCreate()`, `@afterCreate()`
- `@beforeUpdate()`, `@afterUpdate()`
- `@beforeDelete()`, `@afterDelete()`
- `@beforeFind()`, `@afterFind()`
- `@beforeFetch()`, `@afterFetch()`
- `@beforePaginate()`, `@afterPaginate()`

---

## Migrations

### Create Table

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('email').unique().notNullable()
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Column Types

```typescript
table.increments('id')
table.string('name', 255)
table.text('description')
table.integer('count')
table.bigInteger('views')
table.decimal('price', 8, 2)
table.boolean('is_active')
table.date('birth_date')
table.dateTime('published_at')
table.timestamp('created_at')
table.json('metadata')
table.jsonb('settings')
table.uuid('id')
table.enum('status', ['active', 'inactive'])
```

### Column Modifiers

```typescript
table.string('email').notNullable()
table.string('phone').nullable()
table.string('status').defaultTo('pending')
table.integer('count').unsigned()
table.string('email').unique()
table.string('name').index()
table.string('email').comment('User email')
```

### Foreign Keys

```typescript
table.integer('user_id').unsigned()
table.foreign('user_id')
  .references('id')
  .inTable('users')
  .onDelete('CASCADE')
  .onUpdate('CASCADE')
```

### Alter Table

```typescript
async up() {
  this.schema.alterTable('users', (table) => {
    table.string('phone').nullable()
    table.renameColumn('name', 'full_name')
    table.dropColumn('old_field')
  })
}
```

---

## Seeders

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { UserFactory } from '#database/factories/user_factory'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    // Using factories
    await UserFactory.createMany(10)

    // Direct insert
    await User.createMany([
      { email: 'admin@example.com' },
      { email: 'user@example.com' }
    ])

    // Using query builder
    await Database.table('users').multiInsert([...])
  }
}
```

---

## Factories

### Define Factory

```typescript
import Factory from '@adonisjs/lucid/factories'
import User from '#models/user'

export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: 'secret'
  }
})
.state('admin', (user) => user.role = 'admin')
.relation('posts', () => PostFactory)
.build()
```

### Use Factory

```typescript
// Create
const user = await UserFactory.create()
const users = await UserFactory.createMany(10)

// Make (without saving)
const user = await UserFactory.make()

// With state
const admin = await UserFactory.apply('admin').create()

// With relations
const user = await UserFactory.with('posts', 5).create()

// With attributes
const user = await UserFactory.merge({ email: 'custom@example.com' }).create()
```

---

## Configuration

```typescript
import { defineConfig } from '@adonisjs/lucid'

export default defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE')
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations']
      },
      seeders: {
        paths: ['database/seeders']
      }
    }
  }
})
```

---

## Common Patterns

### Pagination

```typescript
const page = await User.query().paginate(1, 20)

page.all()              // Array of users
page.currentPage        // 1
page.perPage            // 20
page.total              // Total count
page.lastPage           // Last page number
page.hasMorePages       // boolean
page.toJSON()           // Serialized response
```

### Soft Deletes

```typescript
class User extends BaseModel {
  @column.dateTime()
  declare deletedAt: DateTime | null

  static boot() {
    super.boot()

    this.before('find', (query) => {
      query.whereNull('deleted_at')
    })
  }
}

// Soft delete
user.deletedAt = DateTime.now()
await user.save()

// Include deleted
User.query().withTrashed()
User.query().onlyTrashed()
```

### Scopes

```typescript
import { scope } from '@adonisjs/lucid/orm'

class User extends BaseModel {
  static active = scope((query) => {
    query.where('status', 'active')
  })

  static byRole = scope((query, role: string) => {
    query.where('role', role)
  })
}

// Use
await User.query().withScopes((scopes) => scopes.active())
await User.query().withScopes((scopes) => scopes.byRole('admin'))
```

### Computed Properties

```typescript
import { computed } from '@adonisjs/lucid/orm'

class User extends BaseModel {
  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @computed()
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}

const user = await User.find(1)
console.log(user.fullName)
```

### Serialization

```typescript
// Default
user.toJSON()

// Custom fields
user.serialize({
  fields: ['id', 'email'],
  relations: {
    posts: {
      fields: ['id', 'title']
    }
  }
})

// Hide fields
class User extends BaseModel {
  @column({ serializeAs: null })
  declare password: string
}
```

---

## Testing Helpers

```typescript
import testUtils from '@adonisjs/lucid/test_utils'
import { test } from '@japa/runner'

test.group('Users', (group) => {
  group.each.setup(async () => {
    // Use global transaction
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('can create user', async ({ assert }) => {
    const user = await UserFactory.create()
    assert.exists(user.id)
  })
})

// Or use test utils
test.group('Users', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  // Or
  group.each.setup(() => testUtils.db().migrate())
})
```

---

## Useful Utilities

```typescript
// Check if model is new
user.$isLocal  // true if not saved

// Check dirty fields
user.$dirty  // { email: 'new@example.com' }

// Original values
user.$original  // { email: 'old@example.com' }

// All attributes
user.$attributes

// Extra data (aggregates, etc.)
user.$extras

// Check if persisted
user.$isPersisted  // true if saved

// Refresh from database
await user.refresh()

// Reload with relations
await user.load('posts')
await user.loadAggregate('posts', (query) => {
  query.count('* as postsCount')
})
```

---

## Error Handling

```typescript
import { errors } from '@adonisjs/lucid'

try {
  const user = await User.findOrFail(1)
} catch (error) {
  if (error instanceof errors.E_ROW_NOT_FOUND) {
    // Handle not found
  }
}
```

---

## Type Safety

```typescript
// Typed query results
const users: User[] = await User.query()

// Typed factory
const user: User = await UserFactory.create()

// Typed relations
class User extends BaseModel {
  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>
}

// posts is typed as Post[]
const user = await User.query().preload('posts').first()
user.posts  // Post[]
```

---

## Performance Tips

```typescript
// Select only needed columns
User.query().select('id', 'email')

// Eager load to avoid N+1
User.query().preload('posts')

// Use aggregates instead of loading models
User.query().withCount('posts')

// Use pagination for large datasets
User.query().paginate(page, perPage)

// Use indexes in migrations
table.index(['email'])
table.index(['user_id', 'created_at'])

// Use transactions for consistency
await Database.transaction(async (trx) => {
  // Multiple operations
})
```
