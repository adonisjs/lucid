/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { BaseTransformer, BaseSerializer } from '@adonisjs/core/transformers'
import type { HasMany, ManyToMany } from '../../src/types/relations.js'
import { column, hasMany, manyToMany } from '../../src/orm/decorators/index.js'
import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

import { defineTransformerBindings } from '../../src/bindings/transformer.js'
defineTransformerBindings(BaseTransformer)

class Serializer extends BaseSerializer {
  wrap = undefined
  definePaginationMetaData() {
    return {}
  }
}

const serializer = new Serializer()

test.group('Transformer | withCount | HasMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get count of a hasMany relationship using withCount', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          postsCount: this.withCount('posts'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    await db
      .insertQuery()
      .table('posts')
      .insert([
        { user_id: 1, title: 'Adonis 101' },
        { user_id: 1, title: 'Lucid 101' },
        { user_id: 2, title: 'Adonis 102' },
      ])

    const users = await User.query().orderBy('id', 'asc').withCount('posts')
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 2)
    assert.equal(result[0].postsCount, 2)
    assert.equal(result[1].postsCount, 1)
  })

  test('throw error when relationship count is not loaded', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          postsCount: this.withCount('posts'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const users = await User.query()

    await assert.rejects(async () => {
      await serializer.serialize(UserTransformer.transform(users))
    }, 'Cannot transform undefined value. Use "this.whenCounted(relationship)" to allow undefined values')
  })
})

test.group('Transformer | whenCounted | HasMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get count when relationship is counted', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          postsCount: this.whenCounted('posts'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    await db
      .insertQuery()
      .table('posts')
      .insert([
        { user_id: 1, title: 'Adonis 101' },
        { user_id: 1, title: 'Lucid 101' },
        { user_id: 2, title: 'Adonis 102' },
      ])

    const users = await User.query().withCount('posts')
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 2)
    assert.equal(result[0].postsCount, 2)
    assert.equal(result[1].postsCount, 1)
  })

  test('return undefined when relationship is not counted', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          postsCount: this.whenCounted('posts'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const users = await User.query()
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 1)
    assert.isUndefined(result[0].postsCount)
  })
})

test.group('Transformer | withCount | ManyToMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get count of a manyToMany relationship using withCount', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          skillsCount: this.withCount('skills'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    await db
      .insertQuery()
      .table('skills')
      .insert([{ name: 'JavaScript' }, { name: 'TypeScript' }, { name: 'Node.js' }])

    await db
      .insertQuery()
      .table('skill_user')
      .insert([
        { user_id: 1, skill_id: 1 },
        { user_id: 1, skill_id: 2 },
        { user_id: 1, skill_id: 3 },
        { user_id: 2, skill_id: 1 },
      ])

    const users = await User.query().withCount('skills')
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 2)
    assert.equal(result[0].skillsCount, 3)
    assert.equal(result[1].skillsCount, 1)
  })

  test('throw error when manyToMany relationship count is not loaded', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          skillsCount: this.withCount('skills'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const users = await User.query()

    await assert.rejects(async () => {
      await serializer.serialize(UserTransformer.transform(users))
    }, 'Cannot transform undefined value. Use "this.whenCounted(relationship)" to allow undefined values')
  })
})

test.group('Transformer | whenCounted | ManyToMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get count when manyToMany relationship is counted', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          skillsCount: this.whenCounted('skills'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    await db
      .insertQuery()
      .table('skills')
      .insert([{ name: 'JavaScript' }, { name: 'TypeScript' }, { name: 'Node.js' }])

    await db
      .insertQuery()
      .table('skill_user')
      .insert([
        { user_id: 1, skill_id: 1 },
        { user_id: 1, skill_id: 2 },
        { user_id: 1, skill_id: 3 },
        { user_id: 2, skill_id: 1 },
      ])

    const users = await User.query().withCount('skills')
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 2)
    assert.equal(result[0].skillsCount, 3)
    assert.equal(result[1].skillsCount, 1)
  })

  test('return undefined when manyToMany relationship is not counted', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare name: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @manyToMany(() => Skill)
      declare skills: ManyToMany<typeof Skill>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          skillsCount: this.whenCounted('skills'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const users = await User.query()
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 1)
    assert.isUndefined(result[0].skillsCount)
  })
})

test.group('Transformer | withAggregate', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get aggregate value using withAggregate', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          totalPosts: this.withAggregate('totalPosts'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    await db
      .insertQuery()
      .table('posts')
      .insert([
        { user_id: 1, title: 'Adonis 101' },
        { user_id: 1, title: 'Lucid 101' },
        { user_id: 2, title: 'Adonis 102' },
      ])

    const users = await User.query().withCount('posts', (query) => {
      query.as('totalPosts')
    })
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 2)
    assert.equal(result[0].totalPosts, 2)
    assert.equal(result[1].totalPosts, 1)
  })

  test('throw error when aggregate is not loaded', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          totalPosts: this.withAggregate('totalPosts'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const users = await User.query()

    await assert.rejects(async () => {
      await serializer.serialize(UserTransformer.transform(users))
    }, 'Cannot transform undefined value. Use "this.whenAggregated(alias)" to allow undefined values')
  })
})

test.group('Transformer | whenAggregated', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('get aggregate value when aggregated', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          totalPosts: this.whenAggregated('totalPosts'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }, { username: 'nikk' }])

    await db
      .insertQuery()
      .table('posts')
      .insert([
        { user_id: 1, title: 'Adonis 101' },
        { user_id: 1, title: 'Lucid 101' },
        { user_id: 2, title: 'Adonis 102' },
      ])

    const users = await User.query().withCount('posts', (query) => {
      query.as('totalPosts')
    })
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 2)
    assert.equal(result[0].totalPosts, 2)
    assert.equal(result[1].totalPosts, 1)
  })

  test('return undefined when aggregate is not loaded', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare title: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasMany(() => Post)
      declare posts: HasMany<typeof Post>
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          username: this.resource.username,
          totalPosts: this.whenAggregated('totalPosts'),
        }
      }
    }

    await db
      .insertQuery()
      .table('users')
      .insert([{ username: 'virk' }])

    const users = await User.query()
    const result = await serializer.serialize(UserTransformer.transform(users))

    assert.lengthOf(result, 1)
    assert.isUndefined(result[0].totalPosts)
  })
})
