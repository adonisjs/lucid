# AdonisJS Lucid - ORM & Models Reference

## BaseModel

**Location**: `src/orm/base_model/index.ts`

The foundation of the Active Record ORM. All models extend from `BaseModel`.

### Basic Model Definition

```typescript
import { BaseModel, column } from '@adonisjs/lucid/orm'

class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare username: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

### Model Configuration

```typescript
class User extends BaseModel {
  // Table name (defaults to snake_case plural of class name)
  static table = 'users'

  // Primary key column (defaults to 'id')
  static primaryKey = 'id'

  // Self-assign primary key (for UUIDs, etc.)
  static selfAssignPrimaryKey = false

  // Adapter for database operations
  static $adapter: AdapterContract

  // Naming strategy (snake_case or camelCase)
  static namingStrategy = new SnakeCaseNamingStrategy()

  // Connection name
  static connection?: string

  // Columns to serialize
  static $columns: Map<string, ModelColumnOptions>

  // Computed properties
  static $computed: Map<string, ComputedOptions>

  // Relations
  static $relations: Map<string, RelationshipsContract>
}
```

---

## Column Decorators

### @column()

**Location**: `src/orm/decorators/index.ts`

Define regular columns.

```typescript
// Basic column
@column()
declare email: string

// Column with options
@column({
  columnName: 'user_email',        // Database column name
  serializeAs: 'email',            // JSON property name
  isPrimary: false,                // Is primary key?
  meta: {},                        // Custom metadata
  serialize: (value) => value,     // Transform on serialize
  prepare: (value) => value,       // Transform before save
  consume: (value) => value,       // Transform after fetch
})
declare email: string

// Column with custom getter/setter
@column()
get email(): string {
  return this.$getAttribute('email')
}
set email(value: string) {
  this.$setAttribute('email', value.toLowerCase())
}
```

### @column.date()

**Location**: `src/orm/decorators/date.ts`

Date columns (stored as YYYY-MM-DD).

```typescript
@column.date()
declare birthDate: DateTime

@column.date({
  autoCreate: true,              // Set to current date on create
  autoUpdate: false,             // Update on every save
  serialize: (value: DateTime) => {
    return value.toFormat('yyyy-MM-dd')
  }
})
declare birthDate: DateTime
```

### @column.dateTime()

**Location**: `src/orm/decorators/date_time.ts`

DateTime columns with timestamp support.

```typescript
@column.dateTime({ autoCreate: true })
declare createdAt: DateTime

@column.dateTime({ autoCreate: true, autoUpdate: true })
declare updatedAt: DateTime

@column.dateTime({
  autoCreate: false,
  autoUpdate: false,
  serialize: (value: DateTime | null) => {
    return value ? value.toISO() : null
  },
  prepare: (value: DateTime) => {
    return value.toSQL()
  },
  consume: (value: string) => {
    return DateTime.fromSQL(value)
  }
})
declare publishedAt: DateTime
```

### @computed()

Computed properties (not stored in database).

```typescript
import { computed } from '@adonisjs/lucid/orm'

@computed()
get fullName() {
  return `${this.firstName} ${this.lastName}`
}

// Don't serialize by default
@computed({ serializeAs: null })
get internalId() {
  return `USER_${this.id}`
}

// Custom serialize name
@computed({ serializeAs: 'display_name' })
get displayName() {
  return this.username || this.email
}
```

---

## CRUD Operations

### Create

```typescript
// Create and save
const user = new User()
user.email = 'user@example.com'
user.username = 'johndoe'
await user.save()

// Create using fill
const user = new User()
user.fill({ email: 'user@example.com', username: 'johndoe' })
await user.save()

// Create using merge
const user = new User()
user.merge({ email: 'user@example.com', username: 'johndoe' })
await user.save()

// Create directly
const user = await User.create({
  email: 'user@example.com',
  username: 'johndoe'
})

// Create many
const users = await User.createMany([
  { email: 'user1@example.com', username: 'user1' },
  { email: 'user2@example.com', username: 'user2' }
])

// First or create
const user = await User.firstOrCreate(
  { email: 'user@example.com' },              // Search criteria
  { email: 'user@example.com', username: 'johndoe' }  // Attributes if creating
)

// Update or create
const user = await User.updateOrCreate(
  { email: 'user@example.com' },              // Search criteria
  { username: 'johndoe', status: 'active' }   // Attributes to set
)

// Fetch or create (without save)
const user = await User.fetchOrNewUpMany(
  'email',                                    // Unique key
  [{ email: 'user1@example.com' }, { email: 'user2@example.com' }]
)
```

### Read

```typescript
// Find by primary key
const user = await User.find(1)
const user = await User.findOrFail(1)  // Throws if not found

// Find by column
const user = await User.findBy('email', 'user@example.com')
const user = await User.findByOrFail('email', 'user@example.com')

// Find many by primary keys
const users = await User.findMany([1, 2, 3])

// Get all
const users = await User.all()

// Query builder
const users = await User.query()
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10)

// First
const user = await User.query().where('email', 'user@example.com').first()
const user = await User.query().where('email', 'user@example.com').firstOrFail()

// Pagination
const page = await User.query().paginate(1, 20)
```

### Update

```typescript
// Update instance
const user = await User.find(1)
user.username = 'newusername'
await user.save()

// Merge and save
const user = await User.find(1)
user.merge({ username: 'newusername', status: 'active' })
await user.save()

// Update multiple records
await User.query()
  .where('status', 'pending')
  .update({ status: 'active' })

// Increment/Decrement
await User.query()
  .where('id', 1)
  .increment('login_count', 1)
```

### Delete

```typescript
// Delete instance
const user = await User.find(1)
await user.delete()

// Delete multiple records
await User.query()
  .where('status', 'inactive')
  .delete()

// Soft delete (if implemented)
const user = await User.find(1)
user.deletedAt = DateTime.now()
await user.save()
```

---

## Model Query Builder

**Location**: `src/orm/query_builder/index.ts`

Enhanced query builder for models with eager loading and scopes.

### Basic Queries

```typescript
// All database query builder methods work
User.query()
  .where('status', 'active')
  .whereNotNull('email_verified_at')
  .orderBy('created_at', 'desc')
  .limit(10)

// Returns model instances (not plain objects)
const users: User[] = await User.query()
```

### Preloading (Eager Loading)

```typescript
// Preload single relation
const users = await User.query().preload('posts')

// Preload multiple relations
const users = await User.query()
  .preload('posts')
  .preload('profile')
  .preload('roles')

// Preload with constraints
const users = await User.query()
  .preload('posts', (query) => {
    query.where('published', true).orderBy('created_at', 'desc')
  })

// Nested preloading
const users = await User.query()
  .preload('posts', (query) => {
    query.preload('comments')
  })

// Preload with aggregates
const users = await User.query()
  .preload('posts', (query) => {
    query.groupLimit(5)  // Latest 5 posts per user
  })

// Preload only once (prevent duplicate loading)
const users = await User.query()
  .preloadOnce('posts')
```

### Aggregates

```typescript
// With count
const users = await User.query()
  .withCount('posts')
// users[0].$extras.posts_count

// With count and alias
const users = await User.query()
  .withCount('posts', (query) => {
    query.as('totalPosts')
  })

// With aggregate
const users = await User.query()
  .withAggregate('posts', (query) => {
    query.sum('views').as('totalViews')
  })

// Multiple aggregates
const users = await User.query()
  .withCount('posts')
  .withCount('comments')
  .withAggregate('posts', (query) => {
    query.sum('views').as('totalViews')
  })
```

### Has Queries (Filter by Relation)

```typescript
// Has relation
const users = await User.query().has('posts')

// Has relation with count
const users = await User.query().has('posts', '>', 10)

// Where has (with constraints)
const users = await User.query()
  .whereHas('posts', (query) => {
    query.where('published', true)
  })

// Or where has
const users = await User.query()
  .whereHas('posts', (query) => {
    query.where('status', 'published')
  })
  .orWhereHas('comments', (query) => {
    query.where('approved', true)
  })

// Doesn't have
const users = await User.query().doesntHave('posts')

// Where doesn't have
const users = await User.query()
  .whereDoesntHave('posts', (query) => {
    query.where('published', false)
  })
```

### Query Scopes

```typescript
// Define scope in model
class User extends BaseModel {
  static active = scope((query) => {
    query.where('status', 'active')
  })

  static recent = scope((query) => {
    query.orderBy('created_at', 'desc')
  })

  static byRole = scope((query, role: string) => {
    query.whereHas('roles', (q) => q.where('name', role))
  })
}

// Use scopes
const users = await User.query()
  .withScopes((scopes) => scopes.active().recent())

const admins = await User.query()
  .withScopes((scopes) => scopes.byRole('admin'))
```

### Soft Deletes

```typescript
// Implement soft deletes
class User extends BaseModel {
  @column.dateTime()
  declare deletedAt: DateTime | null

  // Query without soft deleted
  static withoutSoftDeletes = scope((query) => {
    query.whereNull('deleted_at')
  })

  // Query only soft deleted
  static onlySoftDeleted = scope((query) => {
    query.whereNotNull('deleted_at')
  })
}

// Usage
const users = await User.query()
  .withScopes((scopes) => scopes.withoutSoftDeletes())
```

---

## Relationships

### @hasOne()

**Location**: `src/orm/relations/has_one/`

One-to-one relationship where the foreign key is on the related model.

```typescript
import { hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'

class User extends BaseModel {
  @hasOne(() => Profile)
  declare profile: HasOne<typeof Profile>
}

class Profile extends BaseModel {
  @column()
  declare userId: number  // Foreign key

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

// Usage
const user = await User.find(1)
await user.load('profile')
console.log(user.profile)

// Create related
await user.related('profile').create({ bio: 'Hello world' })

// Save related (existing model)
const profile = new Profile()
profile.bio = 'Hello world'
await user.related('profile').save(profile)

// Query related
const profile = await user.related('profile').query().first()
```

### @hasMany()

**Location**: `src/orm/relations/has_many/`

One-to-many relationship.

```typescript
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

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
const user = await User.find(1)
await user.load('posts')
console.log(user.posts)

// Create related
await user.related('posts').create({ title: 'Hello', body: 'World' })

// Create many
await user.related('posts').createMany([
  { title: 'Post 1', body: 'Content 1' },
  { title: 'Post 2', body: 'Content 2' }
])

// Save related
const post = new Post()
post.title = 'Hello'
await user.related('posts').save(post)

// Save many
await user.related('posts').saveMany([post1, post2])

// Query related
const posts = await user.related('posts')
  .query()
  .where('published', true)
  .orderBy('created_at', 'desc')
```

### @belongsTo()

**Location**: `src/orm/relations/belongs_to/`

Inverse of hasOne/hasMany. Foreign key is on this model.

```typescript
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

class Post extends BaseModel {
  @column()
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

class User extends BaseModel {
  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>
}

// Usage
const post = await Post.find(1)
await post.load('user')
console.log(post.user)

// Associate
const user = await User.find(1)
await post.related('user').associate(user)

// Dissociate
await post.related('user').dissociate()

// Query related
const user = await post.related('user').query().first()
```

### @manyToMany()

**Location**: `src/orm/relations/many_to_many/`

Many-to-many relationship using a pivot table.

```typescript
import { manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

class User extends BaseModel {
  @manyToMany(() => Role, {
    pivotTable: 'role_user',          // Pivot table name
    localKey: 'id',                   // Key on this model
    pivotForeignKey: 'user_id',       // Foreign key in pivot
    relatedKey: 'id',                 // Key on related model
    pivotRelatedForeignKey: 'role_id', // Related foreign key in pivot
    pivotTimestamps: true,            // created_at, updated_at in pivot
    pivotColumns: ['expires_at']      // Extra pivot columns
  })
  declare roles: ManyToMany<typeof Role>
}

class Role extends BaseModel {
  @manyToMany(() => User, {
    pivotTable: 'role_user'
  })
  declare users: ManyToMany<typeof User>
}

// Usage
const user = await User.find(1)
await user.load('roles')
console.log(user.roles)

// Attach (add relationship)
await user.related('roles').attach([1, 2, 3])

// Attach with pivot data
await user.related('roles').attach({
  1: { expires_at: DateTime.now().plus({ days: 30 }) },
  2: { expires_at: DateTime.now().plus({ days: 60 }) }
})

// Detach (remove relationship)
await user.related('roles').detach([1])
await user.related('roles').detach()  // Detach all

// Sync (replace all relationships)
await user.related('roles').sync([1, 2, 3])
await user.related('roles').sync({
  1: { expires_at: DateTime.now().plus({ days: 30 }) }
})

// Access pivot data
const user = await User.query().preload('roles').first()
user.roles.forEach(role => {
  console.log(role.$extras.pivot_created_at)
  console.log(role.$extras.pivot_expires_at)
})

// Query pivot table
const roles = await user.related('roles')
  .query()
  .pivotColumns(['expires_at'])
  .wherePivot('expires_at', '>', DateTime.now())
```

### @hasManyThrough()

**Location**: `src/orm/relations/has_many_through/`

Access distant relations through an intermediate model.

```typescript
import { hasManyThrough } from '@adonisjs/lucid/orm'
import type { HasManyThrough } from '@adonisjs/lucid/types/relations'

// Country -> User -> Post
class Country extends BaseModel {
  @hasManyThrough([
    () => Post,      // Final model
    () => User       // Through model
  ], {
    throughLocalKey: 'id',           // country.id
    throughForeignKey: 'countryId',  // user.country_id
    foreignKey: 'userId',            // post.user_id
    localKey: 'id'                   // user.id
  })
  declare posts: HasManyThrough<typeof Post>
}

class User extends BaseModel {
  @column()
  declare countryId: number

  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>
}

class Post extends BaseModel {
  @column()
  declare userId: number
}

// Usage
const country = await Country.find(1)
await country.load('posts')
console.log(country.posts)  // All posts from users in this country

// Query
const posts = await country.related('posts')
  .query()
  .where('published', true)
```

### Relationship Options

All relationships support these common options:

```typescript
{
  // Foreign keys
  localKey: 'id',              // Key on this model
  foreignKey: 'userId',        // Foreign key on related model

  // Query callbacks
  onQuery: (query) => {
    query.where('status', 'active')
  },

  // Serialization
  serializeAs: 'user_posts'    // JSON key name
}
```

---

## Model Hooks

**Location**: Uses `@poppinss/hooks`

Lifecycle hooks for models.

### Available Hooks

```typescript
import { BaseModel, beforeSave, afterSave, beforeCreate, afterCreate,
         beforeUpdate, afterUpdate, beforeDelete, afterDelete,
         beforeFind, afterFind, beforeFetch, afterFetch,
         beforePaginate, afterPaginate } from '@adonisjs/lucid/orm'

class User extends BaseModel {
  // Before save (create or update)
  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }

  // After create
  @afterCreate()
  static async sendWelcomeEmail(user: User) {
    await Mail.send((message) => {
      message.to(user.email).subject('Welcome!')
    })
  }

  // Before update
  @beforeUpdate()
  static async validateStatus(user: User) {
    if (user.$dirty.status && user.status === 'banned') {
      // Check permissions
    }
  }

  // After delete
  @afterDelete()
  static async cleanupUserData(user: User) {
    await user.related('posts').query().delete()
  }

  // Before find (query hooks)
  @beforeFind()
  static excludeDeleted(query: ModelQueryBuilder) {
    query.whereNull('deleted_at')
  }

  // After fetch (applied after results)
  @afterFetch()
  static async loadDefaults(users: User[]) {
    // Bulk operations on fetched users
  }
}
```

### Hook Context

```typescript
@beforeSave()
static async example(user: User) {
  // Check if new or existing
  user.$isLocal  // true if not yet saved

  // Check which columns changed
  user.$dirty    // { email: 'new@example.com' }

  // Original values
  user.$original // { email: 'old@example.com' }

  // Check if specific column changed
  if (user.$dirty.email) {
    // Email was changed
  }

  // Access attributes
  user.$attributes  // All column values
  user.$extras      // Extra data (aggregates, etc.)
}
```

---

## Model Serialization

### toJSON()

```typescript
const user = await User.find(1)

// Serialize to JSON
const json = user.toJSON()

// Customize serialization
class User extends BaseModel {
  @column({ serializeAs: null })  // Don't serialize
  declare password: string

  @column({ serializeAs: 'emailAddress' })
  declare email: string

  @computed()
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}
```

### Cherry Pick

```typescript
// Serialize only specific fields
const json = user.serialize({
  fields: ['id', 'email', 'username']
})

// Pick relations
const json = user.serialize({
  fields: ['id', 'email'],
  relations: {
    posts: {
      fields: ['id', 'title']
    }
  }
})
```

---

## Naming Strategies

**Location**: `src/orm/naming_strategies/`

Control how model properties map to database columns.

### SnakeCaseNamingStrategy (Default)

```typescript
import { SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'

class User extends BaseModel {
  static namingStrategy = new SnakeCaseNamingStrategy()

  @column()
  declare firstName: string  // Maps to 'first_name'
}
```

### CamelCaseNamingStrategy

```typescript
import { CamelCaseNamingStrategy } from '@adonisjs/lucid/orm'

class User extends BaseModel {
  static namingStrategy = new CamelCaseNamingStrategy()

  @column()
  declare firstName: string  // Maps to 'firstName'
}
```

### Custom Naming Strategy

```typescript
import { BaseModel } from '@adonisjs/lucid/orm'
import type { NamingStrategyContract } from '@adonisjs/lucid/types/model'

class CustomNamingStrategy implements NamingStrategyContract {
  tableName(model: typeof BaseModel): string {
    return model.name.toLowerCase() + 's'
  }

  columnName(model: typeof BaseModel, propertyName: string): string {
    return propertyName
  }

  serializedName(model: typeof BaseModel, propertyName: string): string {
    return propertyName
  }

  paginationMetaKeys(): {
    total: string
    perPage: string
    currentPage: string
    lastPage: string
    firstPage: string
    firstPageUrl: string
    lastPageUrl: string
    nextPageUrl: string
    previousPageUrl: string
  } {
    return {
      total: 'total',
      perPage: 'per_page',
      currentPage: 'current_page',
      lastPage: 'last_page',
      firstPage: 'first_page',
      firstPageUrl: 'first_page_url',
      lastPageUrl: 'last_page_url',
      nextPageUrl: 'next_page_url',
      previousPageUrl: 'previous_page_url'
    }
  }
}
```

---

## Model Pagination

```typescript
// Paginate query
const page = await User.query()
  .where('status', 'active')
  .paginate(1, 20)

// Access data
page.all()              // Model instances
page.currentPage        // Current page number
page.perPage            // Items per page
page.firstPage          // Always 1
page.lastPage           // Last page number
page.total              // Total count
page.hasPages           // More than one page?
page.hasMorePages       // Is there a next page?
page.isEmpty            // No results?

// URLs
page.baseUrl = '/users'
page.getUrl(2)          // /users?page=2
page.getNextPageUrl()   // /users?page=2
page.getPreviousPageUrl() // /users?page=1

// Serialize
const json = page.toJSON()
// {
//   meta: { total, perPage, currentPage, ... },
//   data: [ ... ]
// }
```

---

## Best Practices

### 1. Use Decorators for Column Definitions

```typescript
// Good
@column()
declare email: string

// Bad - no type safety
email: string
```

### 2. Eager Load to Avoid N+1 Queries

```typescript
// Bad - N+1 queries
const users = await User.all()
for (const user of users) {
  await user.load('posts')  // Query per user!
}

// Good - Single query with join
const users = await User.query().preload('posts')
```

### 3. Use Transactions for Related Inserts

```typescript
const trx = await Database.transaction()

try {
  const user = await User.create({ email: 'user@example.com' }, { client: trx })
  await user.related('profile').create({ bio: 'Hello' }, { client: trx })
  await trx.commit()
} catch (error) {
  await trx.rollback()
  throw error
}
```

### 4. Validate in Hooks

```typescript
@beforeSave()
static async validate(user: User) {
  if (user.$dirty.email) {
    const exists = await User.query()
      .where('email', user.email)
      .whereNot('id', user.id)
      .first()

    if (exists) {
      throw new Error('Email already taken')
    }
  }
}
```

### 5. Use Query Scopes for Reusable Filters

```typescript
static active = scope((query) => {
  query.where('status', 'active').whereNull('deleted_at')
})

// Reuse everywhere
const users = await User.query().withScopes((scopes) => scopes.active())
```
