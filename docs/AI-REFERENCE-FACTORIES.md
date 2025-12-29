# AdonisJS Lucid - Factories & Seeders Reference

## Model Factories

**Location**: `src/factories/`

Factories help generate fake data for testing and seeding databases.

---

## Factory Manager

**Location**: `src/factories/main.ts`

### Defining a Factory

```typescript
import Factory from '@adonisjs/lucid/factories'
import User from '#models/user'
import { faker } from '@faker-js/faker'

export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: 'secret',
    isActive: true
  }
}).build()
```

### Using Faker

Factories provide faker instance automatically:

```typescript
Factory.define(User, ({ faker }) => {
  return {
    // Person
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    fullName: faker.person.fullName(),

    // Internet
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: faker.internet.password(),
    url: faker.internet.url(),
    ipv4: faker.internet.ipv4(),

    // Phone
    phone: faker.phone.number(),

    // Address
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country(),

    // Company
    company: faker.company.name(),
    jobTitle: faker.person.jobTitle(),

    // Lorem
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    content: faker.lorem.paragraphs(3),

    // Number
    age: faker.number.int({ min: 18, max: 100 }),
    price: faker.number.float({ min: 10, max: 1000, precision: 0.01 }),

    // Date
    createdAt: faker.date.past(),
    publishedAt: faker.date.recent(),

    // Image
    avatar: faker.image.avatar(),
    image: faker.image.url(),

    // Random
    uuid: faker.string.uuid(),
    boolean: faker.datatype.boolean()
  }
}).build()
```

---

## Creating Model Instances

### Basic Creation

```typescript
// Create single instance (not saved)
const user = await UserFactory.make()

// Create and save
const user = await UserFactory.create()

// Create multiple instances
const users = await UserFactory.makeMany(10)
const users = await UserFactory.createMany(10)
```

### With Custom Attributes

```typescript
// Override factory attributes
const user = await UserFactory.merge({
  email: 'custom@example.com',
  isActive: false
}).create()

// Merge for multiple
const users = await UserFactory.merge({
  isActive: true
}).createMany(5)
```

### Using States

States allow you to define variations of your factory:

```typescript
export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: 'secret',
    isActive: true,
    role: 'user'
  }
})
.state('admin', (user) => {
  user.role = 'admin'
})
.state('inactive', (user) => {
  user.isActive = false
})
.state('verified', (user) => {
  user.emailVerifiedAt = DateTime.now()
})
.build()

// Use states
const admin = await UserFactory.apply('admin').create()
const inactiveUser = await UserFactory.apply('inactive').create()

// Apply multiple states
const verifiedAdmin = await UserFactory
  .apply('admin', 'verified')
  .create()
```

### Sequences

Generate sequential values:

```typescript
Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email(),
    // Use sequence for unique values
    username: (i) => `user${i}`,
  }
}).build()

// Or use a counter
let counter = 0
Factory.define(User, ({ faker }) => {
  return {
    email: `user${++counter}@example.com`,
    username: `user${counter}`
  }
}).build()
```

---

## Factory Relationships

### Has One

```typescript
import User from '#models/user'
import Profile from '#models/profile'

export const ProfileFactory = Factory.define(Profile, ({ faker }) => {
  return {
    bio: faker.lorem.paragraph(),
    avatar: faker.image.avatar()
  }
}).build()

export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email(),
    username: faker.internet.userName()
  }
})
.relation('profile', () => ProfileFactory)
.build()

// Create user with profile
const user = await UserFactory.with('profile').create()

// Create user with custom profile
const user = await UserFactory
  .with('profile', 1, (profile) => {
    profile.merge({ bio: 'Custom bio' })
  })
  .create()
```

### Has Many

```typescript
import User from '#models/user'
import Post from '#models/post'

export const PostFactory = Factory.define(Post, ({ faker }) => {
  return {
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3)
  }
}).build()

export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email()
  }
})
.relation('posts', () => PostFactory)
.build()

// Create user with posts
const user = await UserFactory.with('posts').create()

// Create user with specific number of posts
const user = await UserFactory.with('posts', 5).create()

// Create user with custom posts
const user = await UserFactory
  .with('posts', 3, (post) => {
    post.merge({ published: true })
  })
  .create()
```

### Belongs To

```typescript
export const PostFactory = Factory.define(Post, ({ faker }) => {
  return {
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3)
  }
})
.relation('user', () => UserFactory)
.build()

// Create post with user
const post = await PostFactory.with('user').create()

// Use existing user
const user = await UserFactory.create()
const post = await PostFactory.merge({ userId: user.id }).create()
```

### Many to Many

```typescript
import User from '#models/user'
import Role from '#models/role'

export const RoleFactory = Factory.define(Role, ({ faker }) => {
  return {
    name: faker.helpers.arrayElement(['admin', 'moderator', 'user']),
    description: faker.lorem.sentence()
  }
}).build()

export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email()
  }
})
.relation('roles', () => RoleFactory)
.build()

// Create user with roles
const user = await UserFactory.with('roles').create()

// Create user with specific number of roles
const user = await UserFactory.with('roles', 3).create()

// Create user with pivot data
const user = await UserFactory
  .with('roles', 2, (role) => {
    role.pivotAttributes({ expiresAt: DateTime.now().plus({ days: 30 }) })
  })
  .create()
```

### Nested Relationships

```typescript
// Create user with posts and comments on those posts
const user = await UserFactory
  .with('posts', 3, (post) => {
    post.with('comments', 5)
  })
  .create()

// Complex nesting
const user = await UserFactory
  .with('posts', 2, (post) => {
    post
      .merge({ published: true })
      .with('comments', 3, (comment) => {
        comment.merge({ approved: true })
      })
      .with('tags', 5)
  })
  .with('profile')
  .create()
```

---

## Factory Builder API

### Configuration Methods

```typescript
// Merge attributes
UserFactory.merge({ isActive: true })

// Apply state
UserFactory.apply('admin')

// With relation
UserFactory.with('posts', 5)

// Use transaction
const trx = await Database.transaction()
UserFactory.client(trx)

// Use specific connection
UserFactory.connection('mysql')

// Tap into instance before save
UserFactory.tap((user) => {
  console.log('About to create:', user)
})
```

### Execution Methods

```typescript
// Make (don't save)
const user = await UserFactory.make()
const users = await UserFactory.makeMany(10)

// Create (save to database)
const user = await UserFactory.create()
const users = await UserFactory.createMany(10)

// Make with persistence flag
const user = await UserFactory.makeStubbedAsync()
```

---

## Stub IDs

For unit testing without database:

```typescript
import Factory from '@adonisjs/lucid/factories'

// Customize stub ID generation
Factory.stubId((counter, model) => {
  return counter
})

// Use in tests
const user = UserFactory.makeStubbed()
console.log(user.id)  // Stubbed ID (not from database)
```

---

## Seeders

**Location**: `src/seeders/`

Seeders populate the database with data.

### BaseSeeder

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { UserFactory } from '#database/factories/user_factory'

export default class extends BaseSeeder {
  async run() {
    // Create users
    await UserFactory.createMany(10)
  }
}
```

### Seeder Structure

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Role from '#models/role'

export default class UserSeeder extends BaseSeeder {
  // Run order (lower runs first)
  static environment = ['development', 'testing']

  async run() {
    // Using factories
    const users = await UserFactory.createMany(10)

    // Direct creation
    await User.createMany([
      { email: 'admin@example.com', role: 'admin' },
      { email: 'user@example.com', role: 'user' }
    ])

    // Using query builder
    await Database.table('users').multiInsert([
      { email: 'test1@example.com' },
      { email: 'test2@example.com' }
    ])

    // With relationships
    const admin = await UserFactory
      .apply('admin')
      .with('profile')
      .with('posts', 5)
      .create()
  }
}
```

### Running Seeders

```bash
# Run all seeders
node ace db:seed

# Run specific seeder
node ace db:seed --files=user_seeder.ts

# Run seeders for specific connection
node ace db:seed --connection=mysql

# Interactive mode (select seeders)
node ace db:seed --interactive
```

### Seeder Runner

**Location**: `src/seeders/runner.ts`

```typescript
import { SeederRunner } from '@adonisjs/lucid/seeders'

const runner = new SeederRunner(database, app, {
  connection: 'primary',
  files: ['user_seeder.ts'],
  interactive: false
})

await runner.run()
```

---

## Factory Patterns & Examples

### User with Profile

```typescript
export const UserFactory = Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: 'secret'
  }
})
.relation('profile', () => ProfileFactory)
.state('withProfile', (user) => user.with('profile'))
.build()

// Usage
const user = await UserFactory.apply('withProfile').create()
```

### Blog Post with Everything

```typescript
export const PostFactory = Factory.define(Post, ({ faker }) => {
  return {
    title: faker.lorem.sentence(),
    slug: faker.helpers.slugify(faker.lorem.sentence()),
    content: faker.lorem.paragraphs(5),
    excerpt: faker.lorem.paragraph(),
    published: false
  }
})
.relation('user', () => UserFactory)
.relation('category', () => CategoryFactory)
.relation('tags', () => TagFactory)
.relation('comments', () => CommentFactory)
.state('published', (post) => {
  post.published = true
  post.publishedAt = DateTime.now()
})
.state('draft', (post) => {
  post.published = false
})
.state('withComments', (post) => {
  post.with('comments', 10)
})
.build()

// Create published post with comments and tags
const post = await PostFactory
  .apply('published', 'withComments')
  .with('user')
  .with('tags', 3)
  .with('category')
  .create()
```

### E-commerce Product

```typescript
export const ProductFactory = Factory.define(Product, ({ faker }) => {
  return {
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: faker.commerce.price({ min: 10, max: 1000 }),
    sku: faker.string.alphanumeric(10).toUpperCase(),
    stock: faker.number.int({ min: 0, max: 100 }),
    isActive: true
  }
})
.relation('category', () => CategoryFactory)
.relation('images', () => ProductImageFactory)
.relation('reviews', () => ReviewFactory)
.state('outOfStock', (product) => {
  product.stock = 0
})
.state('featured', (product) => {
  product.isFeatured = true
})
.build()
```

---

## Advanced Patterns

### Conditional Attributes

```typescript
Factory.define(User, ({ faker }) => {
  const isVerified = faker.datatype.boolean()

  return {
    email: faker.internet.email(),
    emailVerifiedAt: isVerified ? DateTime.now() : null,
    verificationToken: isVerified ? null : faker.string.uuid()
  }
}).build()
```

### Unique Constraints

```typescript
const emails = new Set<string>()

Factory.define(User, ({ faker }) => {
  let email
  do {
    email = faker.internet.email()
  } while (emails.has(email))

  emails.add(email)

  return {
    email,
    username: faker.internet.userName()
  }
}).build()
```

### Realistic Timestamps

```typescript
Factory.define(Post, ({ faker }) => {
  const createdAt = faker.date.past({ years: 2 })
  const updatedAt = faker.date.between({
    from: createdAt,
    to: new Date()
  })

  return {
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    createdAt: DateTime.fromJSDate(createdAt),
    updatedAt: DateTime.fromJSDate(updatedAt)
  }
}).build()
```

---

## Testing with Factories

### Test Setup

```typescript
import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'

test.group('User registration', (group) => {
  group.each.setup(async () => {
    // Use global transaction for cleanup
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('can register new user', async ({ assert }) => {
    const user = await UserFactory.create()
    assert.exists(user.id)
  })
})
```

### Factory in Tests

```typescript
test('user can create posts', async ({ assert }) => {
  const user = await UserFactory.create()
  const post = await PostFactory.merge({ userId: user.id }).create()

  assert.equal(post.userId, user.id)
})

test('admin can delete any post', async ({ assert }) => {
  const admin = await UserFactory.apply('admin').create()
  const user = await UserFactory.create()
  const post = await PostFactory.merge({ userId: user.id }).create()

  // Test admin deletion logic
  const canDelete = await admin.canDelete(post)
  assert.isTrue(canDelete)
})
```

### Test Data Isolation

```typescript
test.group('Posts', (group) => {
  let user: User

  group.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })

  group.each.setup(async () => {
    // Create fresh user for each test
    user = await UserFactory.create()
  })

  test('can create post', async ({ assert }) => {
    const post = await PostFactory.merge({ userId: user.id }).create()
    assert.exists(post.id)
  })
})
```

---

## Best Practices

### 1. Keep Factories Simple

```typescript
// Good - simple defaults
Factory.define(User, ({ faker }) => {
  return {
    email: faker.internet.email(),
    password: 'secret'  // Simple default for testing
  }
})

// Bad - complex logic
Factory.define(User, ({ faker }) => {
  // Don't do complex calculations here
})
```

### 2. Use States for Variations

```typescript
// Good
Factory.define(User, ({ faker }) => ({ ... }))
  .state('admin', (user) => { user.role = 'admin' })
  .state('verified', (user) => { user.emailVerifiedAt = DateTime.now() })

// Use: UserFactory.apply('admin', 'verified')
```

### 3. Organize Factories by Domain

```
database/factories/
├── user_factory.ts
├── auth/
│   ├── token_factory.ts
│   └── session_factory.ts
├── blog/
│   ├── post_factory.ts
│   ├── comment_factory.ts
│   └── tag_factory.ts
└── index.ts (exports all)
```

### 4. Create Seeders Per Table/Feature

```
database/seeders/
├── user_seeder.ts
├── role_seeder.ts
├── post_seeder.ts
└── main_seeder.ts (orchestrates all)
```

### 5. Use Transactions in Tests

```typescript
test.group('Users', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })
})
```

### 6. Seed Realistic Data

```typescript
// Good - realistic
export default class extends BaseSeeder {
  async run() {
    // Create realistic user base
    const regularUsers = await UserFactory.createMany(100)
    const admins = await UserFactory.apply('admin').createMany(5)

    // Create posts with realistic distribution
    for (const user of regularUsers) {
      const postCount = faker.number.int({ min: 0, max: 10 })
      await PostFactory.merge({ userId: user.id }).createMany(postCount)
    }
  }
}
```

### 7. Version Control Seeders

Run seeders in order:
```typescript
// 01_user_seeder.ts
// 02_role_seeder.ts
// 03_post_seeder.ts
```

### 8. Use Environment-Specific Seeds

```typescript
export default class extends BaseSeeder {
  static environment = ['development']  // Only in development

  async run() {
    // Development-only seed data
  }
}
```
