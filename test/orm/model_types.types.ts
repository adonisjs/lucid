/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import type { DateTime } from 'luxon'
import { AppFactory } from '@adonisjs/core/factories/app'

import type { HasOne, HasMany, BelongsTo } from '../../src/types/relations.ts'
import { column, hasMany, hasOne, belongsTo } from '../../src/orm/decorators/index.ts'
import { type ModelObject, type ModelQueryBuilderContract } from '../../src/types/model.ts'

import {
  getDb,
  setup,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers/index.ts'

test.group('Model Types | Static Methods', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('query method returns ModelQueryBuilder with correct generic type', async ({
    fs,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'email'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    const query = User.query()
    expectTypeOf(query).toEqualTypeOf<ModelQueryBuilderContract<typeof User, User>>()
  })

  test('find method returns correct instance type', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const findResult = User.find(1)
    expectTypeOf(findResult).resolves.toEqualTypeOf<User | null>()
  })

  test('findOrFail method returns correct non-null instance type', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const findOrFailResult = User.findOrFail(1)
    expectTypeOf(findOrFailResult).resolves.toEqualTypeOf<User>()
  })

  test('create method returns correct instance type', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const createResult = User.create({ username: 'virk' })
    expectTypeOf(createResult).resolves.toEqualTypeOf<User>()
  })

  test('createMany method returns array of correct instance type', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const createManyResult = User.createMany([{ username: 'virk' }, { username: 'nikk' }])
    expectTypeOf(createManyResult).resolves.toEqualTypeOf<User[]>()
  })

  test('findMany method returns array of correct instance type', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const findManyResult = User.findMany([1, 2, 3])
    expectTypeOf(findManyResult).resolves.toEqualTypeOf<User[]>()
  })

  test('all method returns array of correct instance type', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const allResult = User.all()
    expectTypeOf(allResult).resolves.toEqualTypeOf<User[]>()
  })

  test('first method returns correct instance type or null', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const firstResult = User.first()
    expectTypeOf(firstResult).resolves.toEqualTypeOf<User | null>()
  })

  test('firstOrFail method returns correct non-null instance type', async ({
    fs,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const firstOrFailResult = User.firstOrFail()
    expectTypeOf(firstOrFailResult).resolves.toEqualTypeOf<User>()
  })
})

test.group('Model Types | Instance Methods', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('save method returns instance for chaining', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const user = new User()
    user.username = 'virk'

    const saveResult = user.save()
    expectTypeOf(saveResult).resolves.toEqualTypeOf<User>()
  })

  test('delete method returns instance', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const user = new User()
    const deleteResult = user.delete()
    expectTypeOf(deleteResult).resolves.toEqualTypeOf<void>()
  })

  test('refresh method returns instance', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const user = new User()
    const refreshResult = user.refresh()
    expectTypeOf(refreshResult).resolves.toEqualTypeOf<User>()
  })

  test('fill method returns instance for chaining', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const user = new User()
    const fillResult = user.fill({ username: 'virk' })
    expectTypeOf(fillResult).toEqualTypeOf<User>()
  })

  test('merge method returns instance for chaining', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const user = new User()
    const mergeResult = user.merge({ username: 'virk' })
    expectTypeOf(mergeResult).toEqualTypeOf<User>()
  })

  test('load method returns instance for chaining', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      static $columns = ['id', 'userId', 'bio'] as const
      $columns = Profile.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare bio: string
    }

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const user = new User()
    const loadResult = user.load('profile')
    expectTypeOf(loadResult).resolves.toEqualTypeOf<void>()
  })

  test('toJSON method returns object', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const user = new User()
    const jsonResult = user.toJSON()
    expectTypeOf(jsonResult).toEqualTypeOf<ModelObject>()
  })
})

test.group('Model Types | $columns Property', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('static $columns has readonly array type', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'email'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    expectTypeOf(User.$columns).toEqualTypeOf<readonly ['id', 'username', 'email']>()
  })

  test('instance $columns matches static $columns', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'email'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    const user = new User()
    expectTypeOf(user.$columns).toEqualTypeOf<readonly ['id', 'username', 'email']>()
  })

  test('$columns property is accessible from both class and instance', async ({
    fs,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'createdAt', 'updatedAt'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column.dateTime({ autoCreate: true })
      declare createdAt: DateTime

      @column.dateTime({ autoCreate: true, autoUpdate: true })
      declare updatedAt: DateTime
    }

    const user = new User()

    expectTypeOf(User.$columns).toEqualTypeOf<
      readonly ['id', 'username', 'createdAt', 'updatedAt']
    >()
    expectTypeOf(user.$columns).toEqualTypeOf<
      readonly ['id', 'username', 'createdAt', 'updatedAt']
    >()
  })
})

test.group('Model Types | Type Checking Within Class Methods', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('this context has correct types in instance methods', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'email'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string

      getFullInfo() {
        // Type check that `this` has access to all properties
        expectTypeOf(this.id).toEqualTypeOf<number>()
        expectTypeOf(this.username).toEqualTypeOf<string>()
        expectTypeOf(this.email).toEqualTypeOf<string>()

        // Type check that instance methods are available
        expectTypeOf(this.save).toBeFunction()
        expectTypeOf(this.delete).toBeFunction()
        expectTypeOf(this.refresh).toBeFunction()
        expectTypeOf(this.fill).toBeFunction()
        expectTypeOf(this.merge).toBeFunction()

        // Type check that $columns is accessible
        expectTypeOf(this.$columns).toEqualTypeOf<readonly ['id', 'username', 'email']>()

        return `${this.username} <${this.email}>`
      }
    }

    const user = new User()
    user.username = 'virk'
    user.email = 'virk@adonisjs.com'

    const info = user.getFullInfo()
    expectTypeOf(info).toEqualTypeOf<string>()
  })

  test('this context in static methods has correct types', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'email'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string

      static async findByEmail(email: string) {
        // Type check that static `this` has access to query builder methods
        expectTypeOf(this.query).toBeFunction()
        expectTypeOf(this.find).toBeFunction()
        expectTypeOf(this.findOrFail).toBeFunction()
        expectTypeOf(this.create).toBeFunction()
        expectTypeOf(this.createMany).toBeFunction()

        // Type check that $columns is accessible
        expectTypeOf(this.$columns).toEqualTypeOf<readonly ['id', 'username', 'email']>()

        return this.query().where('email', email).first()
      }
    }

    const findByEmailResult = User.findByEmail('virk@adonisjs.com')
    expectTypeOf(findByEmailResult).resolves.toEqualTypeOf<User | null>()
  })

  test('relationship methods work correctly with this context', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      static $columns = ['id', 'userId', 'title'] as const
      $columns = Post.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>

      async getPostsCount() {
        // Load the relationship
        const self = this as User
        await self.load('posts')

        // Type check that the relationship is accessible and has correct type
        expectTypeOf(this.posts).toEqualTypeOf<HasMany<typeof Post>>()

        return this.posts.length
      }
    }

    const user = new User()
    const countResult = user.getPostsCount()
    expectTypeOf(countResult).resolves.toEqualTypeOf<number>()
  })

  test('accessing $columns in custom methods returns correct type', async ({
    fs,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'firstName', 'lastName', 'email'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare firstName: string

      @column()
      declare lastName: string

      @column()
      declare email: string

      getColumnNames() {
        // Access instance $columns
        const instanceColumns = this.$columns
        expectTypeOf(instanceColumns).toEqualTypeOf<
          readonly ['id', 'firstName', 'lastName', 'email']
        >()

        // Access static $columns via constructor
        const staticColumns = (this.constructor as typeof User).$columns
        expectTypeOf(staticColumns).toEqualTypeOf<
          readonly ['id', 'firstName', 'lastName', 'email']
        >()

        return [...this.$columns]
      }

      static getAllColumns() {
        // Access static $columns directly
        expectTypeOf(this.$columns).toEqualTypeOf<
          readonly ['id', 'firstName', 'lastName', 'email']
        >()

        return [...this.$columns]
      }
    }

    const user = new User()
    expectTypeOf(user.getColumnNames()).toEqualTypeOf<
      ('id' | 'firstName' | 'lastName' | 'email')[]
    >()
    expectTypeOf(User.getAllColumns()).toEqualTypeOf<
      ('id' | 'firstName' | 'lastName' | 'email')[]
    >()
  })
})

test.group('Model Types | Complex Scenarios', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('model with all column types has correct $columns', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Article extends BaseModel {
      static $columns = [
        'id',
        'title',
        'content',
        'isPublished',
        'viewCount',
        'rating',
        'metadata',
        'publishedAt',
        'createdAt',
        'updatedAt',
      ] as const
      $columns = Article.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare content: string

      @column()
      declare isPublished: boolean

      @column()
      declare viewCount: number

      @column()
      declare rating: number

      @column()
      declare metadata: Record<string, any>

      @column.date()
      declare publishedAt: DateTime | null

      @column.dateTime({ autoCreate: true })
      declare createdAt: DateTime

      @column.dateTime({ autoCreate: true, autoUpdate: true })
      declare updatedAt: DateTime
    }

    expectTypeOf(Article.$columns).toEqualTypeOf<
      readonly [
        'id',
        'title',
        'content',
        'isPublished',
        'viewCount',
        'rating',
        'metadata',
        'publishedAt',
        'createdAt',
        'updatedAt',
      ]
    >()

    const article = new Article()
    expectTypeOf(article.$columns).toEqualTypeOf<
      readonly [
        'id',
        'title',
        'content',
        'isPublished',
        'viewCount',
        'rating',
        'metadata',
        'publishedAt',
        'createdAt',
        'updatedAt',
      ]
    >()
  })

  test('model with relationships maintains correct type inference', async ({
    fs,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      static $columns = ['id', 'userId', 'bio', 'avatarUrl'] as const
      $columns = Profile.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare bio: string

      @column()
      declare avatarUrl: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class Post extends BaseModel {
      static $columns = ['id', 'userId', 'title', 'content'] as const
      $columns = Post.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string

      @column()
      declare content: string

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    class User extends BaseModel {
      static $columns = ['id', 'username', 'email'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    // Check static $columns are correct
    expectTypeOf(User.$columns).toEqualTypeOf<readonly ['id', 'username', 'email']>()
    expectTypeOf(Profile.$columns).toEqualTypeOf<readonly ['id', 'userId', 'bio', 'avatarUrl']>()
    expectTypeOf(Post.$columns).toEqualTypeOf<readonly ['id', 'userId', 'title', 'content']>()

    // Check instance $columns are correct
    const user = new User()
    const profile = new Profile()
    const post = new Post()

    expectTypeOf(user.$columns).toEqualTypeOf<readonly ['id', 'username', 'email']>()
    expectTypeOf(profile.$columns).toEqualTypeOf<readonly ['id', 'userId', 'bio', 'avatarUrl']>()
    expectTypeOf(post.$columns).toEqualTypeOf<readonly ['id', 'userId', 'title', 'content']>()
  })
})

test.group('Model Types | toAttributes', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('toAttributes returns type-safe object when $columns is defined', async ({
    fs,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    const user = new User()
    const attrs = user.toAttributes()

    // Should only include id and username, not email
    expectTypeOf(attrs).toEqualTypeOf<{
      id: number
      username: string
    }>()

    // Should have id property
    expectTypeOf(attrs.id).toEqualTypeOf<number>()

    // Should have username property
    expectTypeOf(attrs.username).toEqualTypeOf<string>()

    // @ts-expect-error - email should not be accessible
    attrs.email
  })

  test('toAttributes returns Record<string, any> when $columns is not defined', async ({
    fs,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    const user = new User()
    const attrs = user.toAttributes()

    // Should return Record<string, any> when $columns is not defined
    expectTypeOf(attrs).toEqualTypeOf<Record<string, any>>()
  })

  test('toAttributes with nullable columns has correct types', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'bio'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare bio: string | null
    }

    const user = new User()
    const attrs = user.toAttributes()

    expectTypeOf(attrs).toEqualTypeOf<{
      id: number
      username: string
      bio: string | null
    }>()

    expectTypeOf(attrs.bio).toEqualTypeOf<string | null>()
  })

  test('toAttributes with DateTime columns has correct types', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'createdAt', 'updatedAt'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column.dateTime({ autoCreate: true })
      declare createdAt: DateTime

      @column.dateTime({ autoCreate: true, autoUpdate: true })
      declare updatedAt: DateTime
    }

    const user = new User()
    const attrs = user.toAttributes()

    expectTypeOf(attrs).toEqualTypeOf<{
      id: number
      username: string
      createdAt: DateTime
      updatedAt: DateTime
    }>()

    expectTypeOf(attrs.createdAt).toEqualTypeOf<DateTime>()
    expectTypeOf(attrs.updatedAt).toEqualTypeOf<DateTime>()
  })

  test('toAttributes with subset of columns has correct types', async ({ fs, expectTypeOf }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = ['id', 'username', 'email', 'isActive'] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string

      @column()
      declare isActive: boolean

      @column()
      declare password: string
    }

    const user = new User()
    const attrs = user.toAttributes()

    // Should only include columns specified in $columns
    expectTypeOf(attrs).toEqualTypeOf<{
      id: number
      username: string
      email: string
      isActive: boolean
    }>()

    // @ts-expect-error - password should not be accessible
    attrs.password
  })

  test('toAttributes with empty $columns array returns empty object type', async ({
    fs,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static $columns = [] as const
      $columns = User.$columns

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const user = new User()
    const attrs = user.toAttributes()

    // Empty $columns should result in empty object type
    expectTypeOf(attrs).toEqualTypeOf<{}>()

    // @ts-expect-error - id should not be accessible
    attrs.id

    // @ts-expect-error - username should not be accessible
    attrs.username
  })
})
