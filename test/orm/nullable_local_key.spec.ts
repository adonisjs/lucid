/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import type {
  BelongsTo,
  HasMany,
  HasManyThrough,
  HasOne,
  ManyToMany,
} from '../../src/types/relations.js'

import {
  belongsTo,
  column,
  hasMany,
  hasManyThrough,
  hasOne,
  manyToMany,
} from '../../src/orm/decorators/index.js'

import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

/**
 * A nullable local key is a legitimate value: the row simply has no related
 * rows. Only an undefined key is a programmer error, where the column was
 * never selected.
 *
 * belongsTo already draws that distinction. These tests assert the other
 * relation types behave the same way.
 */
test.group('Nullable local key', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  /**
   * Boots an app and returns the db alongside a fresh base model, so each
   * test can declare its own models against the same connection.
   */
  async function boot(fs: any) {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    return { db, BaseModel: getBaseModel(ormAdapter(db)) }
  }

  /**
   * Two users, one with a tenant and one without. The tenant id is
   * deliberately different from the user id, so a test cannot pass by
   * matching on the wrong column.
   *
   * One post belongs to the tenant. A second post is an orphan: its
   * tenant and user are both null. A null local key must never match
   * the orphan, since "where tenant_id is null" would.
   */
  async function seed(db: any) {
    await db
      .insertQuery()
      .table('users')
      .insert([
        { username: 'virk', tenant_id: 10 },
        { username: 'nikk', tenant_id: null },
      ])

    await db
      .insertQuery()
      .table('posts')
      .insert([
        { title: 'Adonis 101', tenant_id: 10, user_id: 1 },
        { title: 'Orphan', tenant_id: null, user_id: null },
      ])
  }

  /**
   * Declares every relation type keyed on the nullable tenant id, so
   * the tests that exercise all of them share one definition.
   */
  function defineModels(BaseModel: ReturnType<typeof getBaseModel>) {
    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare userId: number | null

      @column()
      declare tenantId: number | null
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare body: string
    }

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare tenantId: number | null

      @hasMany(() => Post, { foreignKey: 'tenantId', localKey: 'tenantId' })
      declare posts: HasMany<typeof Post>

      @hasOne(() => Post, { foreignKey: 'tenantId', localKey: 'tenantId' })
      declare post: HasOne<typeof Post>

      @hasManyThrough([() => Comment, () => Post], {
        localKey: 'tenantId',
        foreignKey: 'tenantId',
        throughLocalKey: 'id',
        throughForeignKey: 'postId',
      })
      declare comments: HasManyThrough<typeof Comment>

      @manyToMany(() => Skill, {
        localKey: 'tenantId',
        pivotForeignKey: 'user_id',
        pivotTable: 'skill_user',
      })
      declare skills: ManyToMany<typeof Skill>
    }

    return { User, Post, Comment, Skill }
  }

  /**
   * Rows for the through and pivot relations. Each has a counterpart
   * hanging off a null key, so a null local key has something to
   * wrongly match against.
   */
  async function seedThroughAndPivot(db: any) {
    await db
      .insertQuery()
      .table('comments')
      .insert([
        { post_id: 1, body: 'On the tenant post' },
        { post_id: 2, body: 'On the orphan post' },
      ])

    await db
      .insertQuery()
      .table('skills')
      .insert([{ name: 'Programming' }])

    await db
      .insertQuery()
      .table('skill_user')
      .insert([
        { user_id: 10, skill_id: 1 },
        { user_id: null, skill_id: 1 },
      ])
  }

  test('belongsTo tolerates a null foreign key (existing behaviour)', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number | null

      @belongsTo(() => User)
      declare user: BelongsTo<typeof User>
    }

    await seed(db)

    const posts = await Post.query().orderBy('id', 'asc').preload('user')
    assert.lengthOf(posts, 2)
    assert.equal(posts[0].user.id, 1)
    assert.isNull(posts[1].user)
  })

  test('hasMany tolerates a null local key', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)

    const users = await User.query().orderBy('id', 'asc').preload('posts')
    assert.lengthOf(users, 2)
    assert.lengthOf(users[0].posts, 1)
    assert.equal(users[0].posts[0].title, 'Adonis 101')
    assert.lengthOf(users[1].posts, 0)
  })

  test('hasOne tolerates a null local key', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)

    const users = await User.query().orderBy('id', 'asc').preload('post')
    assert.lengthOf(users, 2)
    assert.equal(users[0].post.title, 'Adonis 101')
    assert.isNull(users[1].post)
  })

  test('manyToMany tolerates a null local key', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)
    await seedThroughAndPivot(db)

    const users = await User.query().orderBy('id', 'asc').preload('skills')
    assert.lengthOf(users, 2)
    assert.lengthOf(users[0].skills, 1)
    assert.lengthOf(users[1].skills, 0)
  })

  test('hasManyThrough tolerates a null local key', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)
    await seedThroughAndPivot(db)

    const users = await User.query().orderBy('id', 'asc').preload('comments')
    assert.lengthOf(users, 2)
    assert.lengthOf(users[0].comments, 1)
    assert.equal(users[0].comments[0].body, 'On the tenant post')
    assert.lengthOf(users[1].comments, 0)
  })

  test('lazy load resolves a null local key to no related rows', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)
    await seedThroughAndPivot(db)

    const user = await User.findOrFail(2)
    assert.isNull(user.tenantId)

    await user.load('posts')
    await user.load('post')
    await user.load('comments')
    await user.load('skills')

    assert.lengthOf(user.posts, 0)
    assert.isNull(user.post)
    assert.lengthOf(user.comments, 0)
    assert.lengthOf(user.skills, 0)
  })

  test('relationship query with a null local key matches no rows', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)
    await seedThroughAndPivot(db)

    const user = await User.findOrFail(2)

    /**
     * A naive "where tenant_id = null" becomes "where tenant_id is null"
     * and would match the orphan rows. The constraint must be one that
     * can never match.
     */
    assert.lengthOf(await user.related('posts').query(), 0)
    assert.isNull(await user.related('post').query().first())
    assert.lengthOf(await user.related('comments').query(), 0)
    assert.lengthOf(await user.related('skills').query(), 0)
  })

  test('update and delete through a null local key touch no rows', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)

    const user = await User.findOrFail(2)

    await user.related('posts').query().update({ title: 'Changed' })
    await user.related('post').query().update({ title: 'Changed' })
    await user.related('posts').query().delete()

    const posts = await db.from('posts').orderBy('id', 'asc').select('title')
    assert.deepEqual(
      posts.map((post: any) => post.title),
      ['Adonis 101', 'Orphan']
    )
  })

  test('persisting through a null local key still raises', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)

    const user = await User.findOrFail(2)

    await assert.rejects(
      () => user.related('posts').create({ title: 'Adonis 102', userId: 2 }),
      'Cannot persist "posts", value of "User.tenantId" is null'
    )
  })

  test('an unselected local key still raises', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)
    const { User } = defineModels(BaseModel)

    await seed(db)

    /**
     * Every relation type routes through its own query builder, so each
     * call site is asserted rather than assuming the shared helper covers
     * them all.
     */
    for (const relation of ['posts', 'post', 'comments', 'skills'] as const) {
      await assert.rejects(
        () => User.query().select('id').preload(relation),
        `Cannot preload "${relation}", value of "User.tenantId" is undefined`
      )
    }
  })
})
