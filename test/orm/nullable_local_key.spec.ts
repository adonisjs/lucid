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

  async function boot(fs: any) {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    return { db, BaseModel: getBaseModel(ormAdapter(db)) }
  }

  /**
   * Two users, one with a tenant and one without, and a post belonging to
   * the first user's tenant.
   */
  async function seed(db: any) {
    await db
      .insertQuery()
      .table('users')
      .insert([
        { username: 'virk', tenant_id: 1 },
        { username: 'nikk', tenant_id: null },
      ])

    await db
      .insertQuery()
      .table('posts')
      .insert([{ title: 'Adonis 101', tenant_id: 1, user_id: 1 }])
  }

  test('belongsTo tolerates a null foreign key (existing behaviour)', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)

    class Tenant extends BaseModel {
      static table = 'posts'

      @column({ isPrimary: true })
      declare id: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare tenantId: number | null

      @belongsTo(() => Tenant, { foreignKey: 'tenantId' })
      declare tenant: BelongsTo<typeof Tenant>
    }

    await seed(db)

    const users = await User.query().orderBy('id', 'asc').preload('tenant')
    assert.lengthOf(users, 2)
    assert.isNull(users[1].tenant)
  })

  test('hasMany tolerates a null local key', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)

    class Post extends BaseModel {
      @column()
      declare tenantId: number | null
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare tenantId: number | null

      @hasMany(() => Post, { foreignKey: 'tenantId', localKey: 'tenantId' })
      declare posts: HasMany<typeof Post>
    }

    await seed(db)

    const users = await User.query().orderBy('id', 'asc').preload('posts')
    assert.lengthOf(users, 2)
    assert.lengthOf(users[0].posts, 1)
    assert.lengthOf(users[1].posts, 0)
  })

  test('hasOne tolerates a null local key', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)

    class Post extends BaseModel {
      @column()
      declare tenantId: number | null
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare tenantId: number | null

      @hasOne(() => Post, { foreignKey: 'tenantId', localKey: 'tenantId' })
      declare post: HasOne<typeof Post>
    }

    await seed(db)

    const users = await User.query().orderBy('id', 'asc').preload('post')
    assert.lengthOf(users, 2)
    assert.isNotNull(users[0].post)
    assert.isNull(users[1].post)
  })

  test('manyToMany tolerates a null local key', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)

    class Skill extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare tenantId: number | null

      @manyToMany(() => Skill, {
        localKey: 'tenantId',
        pivotForeignKey: 'user_id',
        pivotTable: 'skill_user',
      })
      declare skills: ManyToMany<typeof Skill>
    }

    await seed(db)
    await db
      .insertQuery()
      .table('skills')
      .insert([{ name: 'Programming' }])
    await db
      .insertQuery()
      .table('skill_user')
      .insert([{ user_id: 1, skill_id: 1 }])

    const users = await User.query().orderBy('id', 'asc').preload('skills')
    assert.lengthOf(users, 2)
    assert.lengthOf(users[0].skills, 1)
    assert.lengthOf(users[1].skills, 0)
  })

  test('hasManyThrough tolerates a null local key', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare userId: number

      @column()
      declare tenantId: number | null
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare tenantId: number | null

      @hasManyThrough([() => Comment, () => Post], {
        localKey: 'tenantId',
        foreignKey: 'tenantId',
        throughLocalKey: 'id',
        throughForeignKey: 'postId',
      })
      declare comments: HasManyThrough<typeof Comment>
    }

    await seed(db)
    await db
      .insertQuery()
      .table('comments')
      .insert([{ post_id: 1, body: 'nice' }])

    const users = await User.query().orderBy('id', 'asc').preload('comments')
    assert.lengthOf(users, 2)
    assert.lengthOf(users[0].comments, 1)
    assert.lengthOf(users[1].comments, 0)
  })

  test('an unselected local key still raises', async ({ fs, assert }) => {
    const { db, BaseModel } = await boot(fs)

    class Post extends BaseModel {
      @column()
      declare tenantId: number | null
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare tenantId: number | null

      @hasMany(() => Post, { foreignKey: 'tenantId', localKey: 'tenantId' })
      declare posts: HasMany<typeof Post>
    }

    await seed(db)

    await assert.rejects(
      () => User.query().select('id').preload('posts'),
      'Cannot preload "posts", value of "User.tenantId" is undefined'
    )
  })
})
